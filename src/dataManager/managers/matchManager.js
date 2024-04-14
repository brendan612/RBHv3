const { Match, MatchPlayer, UserEloRating, PlayerDraftRound } = require("../../models");

const LobbyService = require("../services/lobbyService.js");
const UserService = require("../services/userService.js");
const DraftService = require("../services/draftService.js");

const { hasRequiredRoleOrHigher } = require("../../utilities/utility-functions.js");

class MatchManager {
    /**
     *
     * @param {Match} match
     */
    constructor(match) {
        this.match = match;
    }
}
