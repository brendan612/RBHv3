const { Lobby } = require("../../models");

class LobbyDTO {
	/**
	 *
	 * @param {Lobby} lobby
	 */
	constructor(lobby) {
		this.lobby_id = lobby.lobby_id;
		this.host_id = lobby.host_id;
		this.draft_id = lobby.draft_id;
		this.game_id = lobby.game_id;
		this.game_name = lobby.Game.name;
		this.lobby_name = lobby.lobby_name;
		this.season_id = lobby.season_id;
		this.season_lobby_id = lobby.season_lobby_id;
		this.created_at = lobby.created_at;
		this.message_id = lobby.message_id;

		this.max_reserves = 3;

		const playersAndReserves = lobby.Users ?? [];
		this.players = playersAndReserves.slice(0, 10);
		this.reserves = playersAndReserves.slice(10);

		this.joinable = this.players.length < 10 + this.max_reserves;
		this.droppable = this.players.length > 0;
		this.draftable = this.players.length === 10 && !this.draft_id;
	}

	/**
	 *
	 * @returns {string}
	 */
	toJSON() {
		return JSON.stringify(this);
	}
}

module.exports = LobbyDTO;
