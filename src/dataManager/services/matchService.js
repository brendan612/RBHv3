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

const ThreadManager = require("../managers/threadManager.js");
const channels = require(`../../../${process.env.CONFIG_FILE}`).channels;
const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;

const {
	hasRequiredRoleOrHigher,
	calculateEloChange,
} = require("../../utilities/utility-functions.js");

const {
	generatePostGameImage,
} = require("../../dataManager/messages/postGameImage.js");

const client = require("../../client.js");

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

				return await MatchPlayer.create({
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
	 * @param {boolean} generateImage
	 */
	async submitWin(winning_team, generateImage = true) {
		const transaction = await sequelize.transaction({
			isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
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

			if (generateImage) {
				try {
					await generatePostGameImage(this.match);
				} catch (error) {
					console.error(
						"Error generating post game image for match: " + this.match.match_id
					);
					console.error(error);
				}
			}

			const draft = await Draft.findByPk(lobby.draft_id);
			if (draft.thread_id) {
				const channel = client.channels.cache.get(
					channels.games["League of Legends"]
				);
				await ThreadManager.deleteThread(channel, draft.thread_id);
			}

			client.cache.clear("lobby_id_" + lobby.lobby_id);
		} catch (error) {
			console.error("Error submitting win for match: " + this.match.match_id);
			console.error(error);
			await transaction.rollback();
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

		console.log(matchesToUpdate.map((m) => m.match_id));

		for (let i = 0; i < matchesToUpdate.length; i++) {
			const match = matchesToUpdate[i];
			if (match.match_id === match_id) {
				//doing this because transactions are wonky
				match.winning_team = winning_team;
				match.end_time = end_time;
			}

			const players = match.MatchPlayers;
			for (let player of players) {
				await player.reload({ transaction });
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
				if (player.user_id === "708492853730607104") {
					console.log(player);
					console.log(eloChange, player.elo_before, enemyAverageElo, winLoss);
				}

				await player.update(
					{
						elo_change: eloChange,
						elo_after: player.elo_before + eloChange,
					},
					{ transaction }
				);
				await player.save({ transaction });

				if (i + 1 < matchesToUpdate.length) {
					const nextMatch = matchesToUpdate[i + 1];
					const nextMatchPlayer = nextMatch.MatchPlayers.find(
						(p) => p.user_id === player.user_id
					);
					if (nextMatchPlayer) {
						nextMatchPlayer.elo_before = player.elo_after;
						await nextMatchPlayer.save({ transaction });
					}
				}

				const userEloRating = await UserEloRating.findOne(
					{
						where: {
							user_id: player.user_id,
							game_id: match.game_id,
							season_id: match.season_id,
						},
					},
					{ transaction }
				);

				if (userEloRating) {
					userEloRating.elo_rating = player.elo_before + eloChange;
					await userEloRating.save({ transaction });
				} else {
					await UserEloRating.create(
						{
							user_id: player.user_id,
							game_id: match.game_id,
							season_id: match.season_id,
							elo_rating: player.elo_before + eloChange,
						},
						{ transaction }
					);
				}
			}
		}
	}
}

module.exports = MatchService;
