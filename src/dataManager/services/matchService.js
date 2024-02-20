const {
	Match,
	MatchPlayer,
	UserEloRating,
	PlayerDraftRound,
	Draft,
	Lobby,
	sequelize,
} = require("../../models");

const { Op, Transaction } = require("sequelize");

const LobbyService = require("../services/lobbyService.js");
const UserService = require("../services/userService.js");
const DraftService = require("../services/draftService.js");

const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;

const {
	hasRequiredRoleOrHigher,
	calculateEloChange,
} = require("../../utilities/utility-functions.js");

const {
	generatePostGameImage,
} = require("../../dataManager/messages/postGameImage.js");

class MatchService {
	/**
	 *
	 * @param {Match} match
	 */
	constructor(match) {
		this.match = match;
	}

	/**
	 *
	 * @param {number} match_id
	 * @returns {Promise<MatchService>}
	 */
	static async createMatchService(match_id) {
		const match = await Match.findOne({
			where: {
				match_id: match_id,
			},
			include: [
				{
					model: MatchPlayer,
				},
			],
		});

		return new MatchService(match);
	}
	/**
	 *
	 * @param {Draft} draft
	 * @returns {Promise<MatchService>}
	 */
	static async createMatch(draft) {
		const lobby = await Lobby.findByPk(draft.lobby_id);

		let match = await Match.create({
			lobby_id: draft.lobby_id,
			game_id: lobby.game_id,
			season_id: lobby.season_id,
			draft_id: draft.draft_id,
			start_time: new Date(),
		});

		await this.createMatchPlayers(lobby, draft, match);

		match = await Match.findOne({
			where: {
				match_id: match.match_id,
			},
			include: [
				{
					model: MatchPlayer,
				},
			],
		});

		draft.match_id = match.match_id;
		await draft.save();

		lobby.match_id = match.match_id;
		await lobby.save();

		return new MatchService(match);
	}

	/**
	 *
	 * @param {Lobby} lobby
	 * @param {Draft} draft
	 * @param {Match} match
	 * @returns {Promise<void>}
	 */
	static async createMatchPlayers(lobby, draft, match) {
		const playerDraftRounds = await PlayerDraftRound.findAll({
			where: {
				draft_id: draft.draft_id,
			},
			order: [["round_number", "ASC"]],
		});

		const matchPlayerPromises = playerDraftRounds.map(
			async (playerDraftRound) => {
				const eloRating = await UserEloRating.findOne({
					where: {
						user_id: playerDraftRound.user_id,
						game_id: lobby.game_id,
						season_id: lobby.season_id,
					},
				});

				let eloBefore = 800;

				if (eloRating) {
					eloBefore = eloRating.elo_rating;
				}

				return MatchPlayer.create({
					match_id: match.match_id,
					user_id: playerDraftRound.user_id,
					team: playerDraftRound.team,
					elo_before: eloBefore,
				});
			}
		);

		await Promise.all(matchPlayerPromises);
	}

	/**
	 *
	 * @param {number} match_id
	 * @returns {Promise<Match>}
	 */
	static async getMatch(match_id) {
		const match = await Match.findOne({
			where: {
				match_id: match_id,
			},
			include: [
				{
					model: MatchPlayer,
				},
			],
		});

		return match;
	}

	/**
	 *
	 * @param {string} winning_team
	 */
	async submitWin(winning_team) {
		const transaction = await sequelize.transaction({
			isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED, // or another level that suits your needs
		});

		try {
			const players = this.match.MatchPlayers;
			const roleUpdatePromises = players.map(async (player) => {
				const userService = await UserService.createUserService(player.user_id);
				await userService.removeRole(permission_roles.lobby_participant);
			});
			await Promise.all(roleUpdatePromises);

			const end_time = this.match.end_time ?? new Date();

			await this.match.update(
				{ winning_team: winning_team, end_time: end_time },
				{ transaction }
			);

			await this.updateAffectedMatches(
				transaction,
				this.match.match_id,
				winning_team,
				end_time
			);

			const lobby = await Lobby.findByPk(this.match.lobby_id);
			if (lobby.closed_date === null) {
				lobby.closed_date = end_time;
				await lobby.save({ transaction });
			}

			await transaction.commit();

			await this.match.reload({
				include: [{ model: MatchPlayer }],
			});
			await generatePostGameImage(this.match);
		} catch (error) {
			await transaction.rollback();
			console.error("Error submitting win for match: " + this.match.match_id);
			console.error(error);
		}
	}

	async updateAffectedMatches(transaction, match_id, winning_team, end_time) {
		const matchesToUpdate = await Match.findAll(
			{
				where: {
					game_id: this.match.game_id,
					season_id: this.match.season_id,
					match_id: {
						[Op.gte]: this.match.match_id,
					},
				},
				include: [
					{
						model: MatchPlayer,
					},
				],
				order: [["end_time", "ASC"]],
			},
			{ transaction }
		);

		for (const match of matchesToUpdate) {
			if (match.match_id === match_id) {
				//doing this because transactions are wonky
				match.winning_team = winning_team;
				match.end_time = end_time;
			}

			for (const player of match.MatchPlayers) {
				try {
					const winLoss = player.team === match.winning_team ? 1 : 0;
					const enemyTeam = player.team === "blue" ? "red" : "blue";
					const enemyPlayers = match.MatchPlayers.filter(
						(player) => player.team === enemyTeam
					);
					const enemyTotalElo = enemyPlayers.reduce(
						(acc, enemy) => acc + enemy.elo_before,
						0
					);

					const enemyAverageElo = enemyTotalElo / enemyPlayers.length;

					const eloChange = calculateEloChange(
						player.elo_before,
						enemyAverageElo,
						winLoss
					);

					await player.update(
						{
							elo_change: eloChange,
							elo_after: player.elo_before + eloChange,
						},
						{ transaction }
					);
					await player.save({ transaction });

					const eloRating = await UserEloRating.findOne(
						{
							where: {
								user_id: player.user_id,
								game_id: this.match.game_id,
								season_id: this.match.season_id,
							},
						},
						{ transaction }
					);

					if (eloRating) {
						eloRating.elo_rating = player.elo_after;
						await eloRating.save({ transaction });
					} else {
						await UserEloRating.create(
							{
								user_id: player.user_id,
								game_id: this.match.game_id,
								season_id: this.match.season_id,
								elo_rating: 800 + eloChange,
							},
							{ transaction }
						);
					}
				} catch (error) {
					console.error(error);
				}
			}
		}
	}
}

module.exports = MatchService;