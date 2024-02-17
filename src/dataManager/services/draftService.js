const {
	Draft,
	Lobby,
	User,
	UserEloRating,
	Match,
	MatchPlayer,
	PlayerDraftRound,
	Sequelize,
} = require("../../models/index.js");
const { Op } = require("sequelize");
const LobbyService = require("./lobbyService.js");
const UserService = require("./userService.js");
const PlayerDraftService = require("./playerDraftService.js");
const LobbyDTO = require("../DTOs/lobbyDTO.js");
const DraftDTO = require("../DTOs/draftDTO.js");

const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const {
	generatePostGameImage,
} = require("../../dataManager/messages/postGameImage.js");

const client = require("../../client.js");

class DraftService {
	/**
	 *
	 * @param {Draft} draft
	 */
	constructor(draft) {
		this.draft = draft;
	}

	/**
	 *
	 * @param {number} draft_id
	 * @returns {Promise<DraftDTO>}
	 */
	static async getDraft(draft_id) {
		const draft = await Draft.findByPk(draft_id);
		return new DraftDTO(draft);
	}

	/**
	 *
	 * @param {number} lobby_id
	 * @returns {Promise<DraftDTO>}
	 */
	static async createDraft(lobby_id) {
		const LobbyService = require("./lobbyService.js");
		const lobby = await LobbyService.getLobby(lobby_id);
		if (!lobby) {
			throw new Error("Lobby not found");
		}
		if (lobby.draft_id) {
			throw new Error("Lobby already drafted");
		}

		const draft = await Draft.create({
			lobby_id: lobby_id,
			host_id: lobby.host_id,
		});

		const lobbyModel = await Lobby.findByPk(lobby_id);
		await lobbyModel.update({ draft_id: draft.draft_id });
		await lobbyModel.save();

		return new DraftDTO(draft);
	}

	async setMessage(message_id) {
		await this.draft.update({ message_id: message_id });
		await this.draft.save();
	}

	async setThread(thread_id) {
		await this.draft.update({ thread_id: thread_id });
		await this.draft.save();
	}
	/**
	 *
	 * @param {LobbyDTO} lobby
	 * @returns {Promise<UserEloRatings[]>} captains
	 */
	async pickCaptains(lobby) {
		let ratings = [];
		for (const player of lobby.players) {
			const userService = new UserService(player);
			let elo = await userService.getEloRating(lobby.game_id, lobby.season_id);
			if (elo) {
				ratings.push(elo);
			} else {
				elo = await userService.getEloRating(lobby.game_id);
				if (elo) {
					ratings.push(elo);
				} else {
					elo = await UserEloRating.create({
						user_id: player.user_id,
						game_id: lobby.game_id,
						season_id: lobby.season_id,
						elo_rating: 1600,
					});
				}
			}
		}
		ratings.sort((a, b) => b.elo_rating - a.elo_rating);
		return ratings.slice(0, 2);
	}

	async startPlayerDraft() {
		const PlayerDraftService = require("./playerDraftService.js");
		const playerDraftService = new PlayerDraftService(this.draft);
		/** @typedef PlayerDraftManager */
		const playerDraftManager =
			client.managers.playerDraftManagerFactory.getPlayerDraftManager(
				this.draft.draft_id
			);

		const LobbyService = require("./lobbyService.js");
		const lobby = await LobbyService.getLobby(this.draft.lobby_id);

		playerDraftManager.captains = await this.pickCaptains(lobby);

		await playerDraftService.generatePlayerDraftEmbed(
			await DraftService.getDraft(this.draft.draft_id),
			true
		);
	}

	/**
	 *
	 * @param {string} winningTeam red or blue
	 */
	async submitMatchWin(winningTeam) {
		const LobbyService = require("./lobbyService.js");
		const lobby = await Lobby.findByPk(this.draft.lobby_id);
		const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

		for (const player of lobbyDTO.players) {
			const userService = new UserService(player);
			await userService.removeRole(permission_roles.lobby_participant);
		}

		await this.draft.update({ winning_team: winningTeam });
		await this.draft.save();

		let currentMatch = await Match.findOne({
			where: {
				draft_id: this.draft.draft_id,
			},
		});

		//create or update match
		if (!currentMatch) {
			currentMatch = await Match.create({
				lobby_id: lobby.lobby_id,
				game_id: lobby.game_id,
				season_id: lobby.season_id,
				winning_team: winningTeam,
				draft_id: this.draft.draft_id,
				start_time: new Date(),
				end_time: new Date(),
			});
		} else {
			currentMatch.winning_team = winningTeam;
			await currentMatch.save();
		}

		await lobby.update({
			closed_date: new Date(),
			match_id: currentMatch.match_id,
		});
		await lobby.save();

		//find all matches after this one including this one
		let matchesToUpdate = await Match.findAll({
			where: {
				game_id: lobby.game_id,
				season_id: lobby.season_id,
				end_time: {
					[Op.gte]: currentMatch.end_time,
				},
			},
			order: [["end_time", "ASC"]],
		});

		//update elo for all players in all matches after this one
		for (const match of matchesToUpdate) {
			const playerDraftRounds = await PlayerDraftRound.findAll({
				where: {
					draft_id: match.draft_id,
				},
			});

			let matchPlayers = await MatchPlayer.findAll({
				where: {
					match_id: match.match_id,
				},
			});

			const previousElo = new Map();

			if (matchPlayers.length === 0) {
				for (const playerDraftRound of playerDraftRounds) {
					const previousMatch = await Match.findOne({
						where: {
							game_id: lobby.game_id,
							season_id: lobby.season_id,
							end_time: {
								[Op.lt]: match.end_time,
							},
						},
						include: [
							{
								model: MatchPlayer,
								required: true,
								where: { user_id: playerDraftRound.user_id },
							},
						],
						order: [["end_time", "DESC"]],
					});

					if (previousMatch) {
						previousElo.set(
							playerDraftRound.user_id,
							previousMatch.MatchPlayers[0].elo_after
						);
					} else {
						previousElo.set(playerDraftRound.user_id, 800);
					}

					await MatchPlayer.create({
						match_id: match.match_id,
						user_id: playerDraftRound.user_id,
						team: playerDraftRound.team,
						elo_change: 0, //temporary
						elo_before: previousElo.get(playerDraftRound.user_id),
						elo_after: 800, //temporary
					});
				}

				matchPlayers = await MatchPlayer.findAll({
					where: {
						match_id: match.match_id,
					},
				});
			}

			for (const playerDraftRound of playerDraftRounds) {
				const winLoss = playerDraftRound.team === winningTeam ? 1 : 0;
				let matchPlayer = await MatchPlayer.findOne({
					where: {
						match_id: match.match_id,
						user_id: playerDraftRound.user_id,
					},
				});

				const enemyTeam = matchPlayers.filter((matchPlayer) => {
					return matchPlayer.team !== playerDraftRound.team;
				});

				const averageOpponentElo =
					enemyTeam
						.map((matchPlayer) => matchPlayer.elo_before)
						.reduce((a, b) => a + b, 0) / enemyTeam.length;

				const eloChange = this.calculateEloChange(
					previousElo.get(playerDraftRound.user_id),
					averageOpponentElo,
					winLoss
				);

				matchPlayer.elo_change = eloChange;
				matchPlayer.elo_after =
					previousElo.get(playerDraftRound.user_id) + eloChange;
				matchPlayer.save();

				const userEloRating = await UserEloRating.findOne({
					where: {
						user_id: playerDraftRound.user_id,
						game_id: lobby.game_id,
						season_id: lobby.season_id,
					},
				});

				if (!userEloRating) {
					await UserEloRating.create({
						user_id: playerDraftRound.user_id,
						game_id: lobby.game_id,
						season_id: lobby.season_id,
						elo_rating: matchPlayer.elo_after,
					});
				} else {
					userEloRating.elo_rating = matchPlayer.elo_after;
					userEloRating.save();
				}

				if (matchesToUpdate.length === 1) {
					const user = await User.findByPk(matchPlayer.user_id);
					const userService = new UserService(user);
					if (winLoss === 1) {
						await userService.addMoney(lobby.game_id, lobby.season_id, 200);
					} else {
						await userService.addMoney(lobby.game_id, lobby.season_id, 100);
					}
				}
			}
		}

		await generatePostGameImage(currentMatch);
	}

	calculateEloChange(currentRating, opponentRating, winLoss) {
		const k = 32;
		const expectedScore =
			1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
		return Math.round(k * (winLoss - expectedScore));
	}
}

module.exports = DraftService;
