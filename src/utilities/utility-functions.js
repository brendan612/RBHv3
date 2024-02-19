const PlayerDraftManager = require("../dataManager/managers/playerDraftManager.js");
const { LeagueRankEmojis, LeagueRoleEmojis } = require("../assets/emojis.js");
const { User } = require("../models");
const { GuildMember } = require("discord.js");

const permission_roles = require(`../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const roleHierarchy = require("../utilities/role-hierarchy.js");
const { re } = require("mathjs");

/**
 *
 * @param {GuildMember} member
 * @param {string} requiredRoleName
 * @returns
 */
function hasRequiredRoleOrHigher(member, requiredRoleName) {
	const requiredRoleID = permission_roles[requiredRoleName];
	if (!requiredRoleID) {
		console.error("Invalid requiredRoleName:", requiredRoleName);
		return false;
	}

	const requiredRoleIndex = roleHierarchy.indexOf(requiredRoleID);
	if (requiredRoleIndex === -1) {
		console.error("Required role not found in roleHierarchy array");
		return false;
	}

	return member.roles.cache.some((role) => {
		const memberRoleIndex = roleHierarchy.indexOf(role.id);
		return memberRoleIndex !== -1 && memberRoleIndex <= requiredRoleIndex;
	});
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
	const PlayerDraftManager = require("../dataManager/managers/playerDraftManager.js");
	const ranks = await PlayerDraftManager.getRanks(players);
	const combinedList = players
		.map((player, index) => {
			// Pad the player name to have equal length
			const paddedName = player.summoner_name?.padEnd(32, "\u0020");
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

function calculateEloChange(currentRating, opponentRating, winLoss) {
	const k = 32;
	const expectedScore =
		1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
	return Math.round(k * (winLoss - expectedScore));
}

module.exports = {
	hasRequiredRole,
	hasRequiredRoleOrHigher,
	generateTeamPlayerList,
	formatDateToMMDDYYYY,
	calculateEloChange,
};
