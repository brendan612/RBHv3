const {
	Match,
	MatchPlayer,
	UserEloRating,
	PlayerDraftRound,
	Draft,
	Lobby,
	sequelize,
} = require("../../models");

const { Op } = require("sequelize");

const LobbyService = require("../services/lobbyService.js");
const UserService = require("../services/userService.js");
const DraftService = require("../services/draftService.js");

const permission_roles =
	require(`../../../${process.env.CONFIG_FILE}`).permission_roles;

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
					include: [
						{
							model: UserEloRating,
						},
					],
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
		});

		await createMatchPlayers(lobby, draft, match);

		match = await Match.findOne({
			where: {
				match_id: match.match_id,
			},
			include: [
				{
					model: MatchPlayer,
					include: [
						{
							model: UserEloRating,
						},
					],
				},
			],
		});

		return new MatchService(match);
	}

	/**
	 *
	 * @param {Lobby} lobby
	 * @param {Draft} draft
	 * @param {Match} match
	 * @returns {Promise<void>}
	 */
	async createMatchPlayers(lobby, draft, match) {
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

				const eloBefore = eloRating.elo_rating ?? 800;

				return MatchPlayer.create({
					match_id: match.match_id,
					user_id: user.user_id,
					team: playerDraftRound.team,
					elo_before: eloBefore,
				});
			}
		);

		await Promise.all(matchPlayerPromises);
	}

	/**
	 *
	 * @param {string} winning_team
	 */
	async submitWin(winning_team) {
		const transaction = await sequelize.transaction();

		try {
			const players = this.match.MatchPlayers;
			const roleUpdatePromises = players.map(async (player) => {
				const userService = UserService.createUserService(player.user_id);
				await userService.removeRole(permission_roles.lobby_participant);
			});
			await Promise.all(roleUpdatePromises);

			await this.match.update(
				{ winning_team: winning_team, end_time: new Date() },
				{ transaction }
			);
			await this.match.save({ transaction });
			await this.updateAffectedMatches(transaction);

			await transaction.commit();

			await generatePostGameImage(this.match);
		} catch (error) {
			await transaction.rollback();
			console.error("Error submitting win for match: " + this.match.match_id);
			console.error(error);
		}
	}

	async updateAffectedMatches(transaction) {
		const matchesToUpdate = await Match.findAll(
			{
				where: {
					game_id: this.match.game_id,
					season_id: this.match.season_id,
					end_time: {
						[Op.gte]: this.match.end_time,
					},
				},
				include: [
					{
						model: MatchPlayer,
						include: [
							{
								model: UserEloRating,
							},
						],
					},
				],
				order: [["end_time", "ASC"]],
			},
			{ transaction }
		);

		const matchUpdates = matchesToUpdate.map(async (match) => {
			for (const player of match.MatchPlayers) {
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
				-(await player.save({ transaction }));
			}
		});

		await Promise.all(matchUpdates);
	}
}

module.exports = MatchService;
