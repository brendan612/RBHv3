const {
	Draft,
	Lobby,
	UserEloRating,
	MatchPlayer,
	Match,
} = require("../../models/index.js");
const UserService = require("./userService.js");
const LobbyDTO = require("../DTOs/lobbyDTO.js");
const DraftDTO = require("../DTOs/draftDTO.js");

const { getStatsForUser } = require("../../dataManager/queries/stats/stats.js");

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
		let ineligiblePlayers = [];
		let eligiblePlayers = [];

		for (const player of lobby.players) {
			const userService = new UserService(player);
			let elo = await userService.getEloRating(lobby.game_id, lobby.season_id);
			const totalMatches = await MatchPlayer.count({
				where: {
					user_id: player.user_id,
				},
				include: [
					{
						model: Match,
						where: {
							game_id: lobby.game_id,
						},
					},
				],
			});

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
						elo_rating: 800,
					});
				}
			}

			if (totalMatches < 5) {
				ineligiblePlayers.push(elo);
			} else {
				eligiblePlayers.push(elo);
			}
		}

		ratings.sort((a, b) => b.elo_rating - a.elo_rating);
		eligiblePlayers.sort((a, b) => b.elo_rating - a.elo_rating);

		let selectedCaptains = eligiblePlayers.slice(0, 2);
		if (selectedCaptains.length < 2) {
			selectedCaptains = selectedCaptains.concat(
				ineligiblePlayers.slice(0, 2 - selectedCaptains.length)
			);
		}
		return selectedCaptains;
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
		playerDraftManager.picking_captain = playerDraftManager.captains[1];

		await playerDraftService.generatePlayerDraftEmbed(
			await DraftService.getDraft(this.draft.draft_id),
			true
		);
	}
}

module.exports = DraftService;
