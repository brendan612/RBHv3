const { Match } = require("../../models");
const client = require("../../client.js");
const { Channel } = require("discord.js");

const ChannelManager = require("../managers/channelManager.js");

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

        /**@type {Map<string, Channel>} */
        this.channels = new Map();
        const generalChannel = ChannelManager.getChannelViaServerChannel(match.game_id, match.region_id, "general");

        this.channels.set("general", generalChannel);

        const winsChannel = ChannelManager.getChannelViaServerChannel(match.game_id, match.region_id, "wins");
        this.channels.set("wins", winsChannel);
    }
}

module.exports = MatchDTO;
