const { Match } = require("../../models");
const client = require("../../client.js");

class MatchDTO {
	/**
	 *
	 * @param {Match} match
	 */
	constructor(match) {
		this.match_id = match.match_id;
		this.game_id = match.game_id;
		this.season_id = match.season_id;
		this.lobby_id = match.lobby_id;
		this.start_time = match.start_time;
		this.end_time = match.end_time;
		this.winning_team = match.winning_team;
		this.draft_id = match.draft_id;
		this.region_id = match.region_id;

		this.channels = new Map();
		const general = client.guild.channels.cache.get(
			client.serverChannels.filter(
				(c) =>
					c.game_id == match.game_id &&
					c.region_id == match.region_id &&
					c.type == "general"
			)[0].channel_id
		);
		this.channels.set("general", general);
		const wins = client.guild.channels.cache.get(
			client.serverChannels.filter(
				(c) =>
					c.game_id == match.game_id &&
					c.region_id == match.region_id &&
					c.type == "wins"
			)[0].channel_id
		);
		this.channels.set("wins", wins);
	}
}

module.exports = MatchDTO;
