const PlayerDraftManager = require("../dataManager/managers/playerDraftManager.js");
const { LeagueRankEmojis, LeagueRoleEmojis } = require("../assets/emojis.js");
const { User } = require("../models");

function hasRequiredRoleOrHigher(member, requiredRole) {
	const memberRoles = member.roles.cache.map((role) => role.id);
	const allowedRoles = [requiredRole, ...roleHierarchy[requiredRole]];
	return memberRoles.some((role) => allowedRoles.includes(role));
}

function hasRequiredRole(member, requiredRole) {
	const memberRoles = member.roles.cache.map((role) => role.id);
	return memberRoles.includes(requiredRole);
}

/**
 *
 * @param {User[]} players
 * @returns {Promise<string>}
 */
async function generateTeamPlayerList(players) {
	const ranks = await PlayerDraftManager.getRanks(players);
	const combinedList = players
		.map((player, index) => {
			// Pad the player name to have equal length
			const paddedName = player.summoner_name.padEnd(32, "\u0020");
			const emojis =
				`${LeagueRoleEmojis[player.primary_role]}${
					LeagueRankEmojis[ranks.get(BigInt(player.user_id)).toUpperCase()]
				}` || "";
			// Return the combined string, padded as necessary
			//prettier-ignore
			return `${(index + 1 < 10 ? `0${index + 1}` : index + 1)
				.toString()
				.padStart(2, " ")}. ${emojis} ${paddedName}`;
		})
		.join("\n");

	if (combinedList === "") {
		return ">>> \u0020";
	}
	return ">>> " + combinedList;
}

function formatDateToMMDDYYYY(date) {
	let day = date.getDate().toString();
	let month = (date.getMonth() + 1).toString(); // getMonth() returns 0-11
	let year = date.getFullYear().toString();

	// Pad the month and day with leading zeros if necessary
	month = month.length < 2 ? "0" + month : month;
	day = day.length < 2 ? "0" + day : day;

	return `${month}/${day}/${year}`;
}

module.exports = {
	hasRequiredRole,
	hasRequiredRoleOrHigher,
	generateTeamPlayerList,
	formatDateToMMDDYYYY,
};
