const DraftDTO = require("../DTOs/draftDTO");
const UserDTO = require("../DTOs/userDTO");
const PlayerDraftService = require("../services/playerDraftService.js");
const { getRankByRiotID } = require("../../api/riot/riotApiHandler.js");
const {
	LeagueTier,
	LeagueTierHierarchy,
} = require("../../components/leagueRankedEnums.js");

class PlayerDraftManager {
	static ranks = new Map();

	constructor(draft_id) {
		this.draft_id = draft_id;
		this.currentRound = 1;
		this.currentTeam = "blue";
		this.captains = [];
		this.red_captain = null;
		this.blue_captain = null;
		this.picking_captain = null; //the captain that picks which side to be on. this will be the captain with the lower elo
	}

	async reset() {
		this.currentRound = 1;
		this.currentTeam = "blue";
		this.captains = [];
		this.red_captain = null;
		this.blue_captain = null;
		this.picking_captain = null;
	}
	/**
	 *
	 * @param {PlayerDraftService} draftService
	 */
	async setDraftService(draftService) {
		this.draftService = draftService;
	}

	/**
	 *
	 * @param {UserDTO} players
	 */
	async handleRoundPicks(players) {
		for (const player of players) {
			await this.handlePlayerPick(player, this.currentTeam, this.currentRound);
		}

		this.currentTeam = this.currentTeam === "red" ? "blue" : "red";
		this.currentRound++;
	}

	/**
	 *
	 * @returns {number}
	 */
	maxPicks() {
		//blue captain, red captain
		//blue
		//blue
		//red
		//red
		//blue
		//red
		//red
		//blue
		switch (this.currentRound) {
			//starts with round 2 because round 1 is the captains picking sides
			case 2: //blue picks 1
				return 1;
			case 3: //red picks 2
				return 2;
			case 4: //blue picks 2
				return 2;
			case 5: //red picks 2
				return 2;
			case 6: //blue picks 1 - will happen automatically
				return 1;
			default:
				return 0;
		}
	}

	/**
	 *
	 * @param {User} players
	 */
	static async getRanks(players) {
		const defaultRank = "UNRANKED";
		for (const player of players) {
			const user_id = player.user_id;
			let rank = PlayerDraftManager.ranks.get(user_id);
			if (!rank && user_id > 20) {
				try {
					rank = await getRankByRiotID(
						player.summoner_name,
						player.tag_line,
						player.region_id
					);
					const highestRank = PlayerDraftManager.getHighestQueueRank(rank);
					PlayerDraftManager.ranks.set(user_id, highestRank);
				} catch (err) {
					PlayerDraftManager.ranks.set(user_id, defaultRank);
					rank = defaultRank;
				}
			} else if (!rank && user_id <= 20) {
				PlayerDraftManager.ranks.set(user_id, defaultRank);
				rank = defaultRank;
			}
		}
		return new Map(
			players.map((player) => [
				player.user_id,
				PlayerDraftManager.ranks.get(player.user_id),
			])
		);
	}

	static getHighestQueueRank(summoner) {
		let highestIndex = LeagueTierHierarchy.indexOf(LeagueTier.UNRANKED);
		function isValidRank(summoner) {
			return (
				LeagueTierHierarchy.indexOf(summoner.tier) >=
				LeagueTierHierarchy.indexOf(LeagueTier.GOLD)
			);
		}
		console.log(summoner);
		if (!summoner) return;
		if (Array.isArray(summoner)) {
			if (summoner.length > 1) {
				highestIndex = LeagueTierHierarchy.indexOf(LeagueTier.UNRANKED);
				if (isValidRank(summoner[0])) {
					console.log("VALID RANK", summoner[0].tier, summoner[0].rank);
					highestIndex = LeagueTierHierarchy.indexOf(summoner[0].tier);
				}
				if (isValidRank(summoner[1])) {
					console.log("VALID RANK", summoner[1].tier, summoner[1].rank);
					highestIndex = Math.max(
						highestIndex,
						LeagueTierHierarchy.indexOf(summoner[1].tier)
					);
				}
			}
		} else {
			if (isValidRank(summoner)) {
				console.log("VALID RANK", summoner.tier, summoner.rank);
				highestIndex = LeagueTierHierarchy.indexOf(summoner.tier);
			}
		}
		return LeagueTierHierarchy[highestIndex];
	}
}

module.exports = PlayerDraftManager;
