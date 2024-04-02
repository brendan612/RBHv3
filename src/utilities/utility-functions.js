const { LeagueRankEmojis, LeagueRoleEmojis } = require("../assets/emojis.js");
const { User, ServerChannel } = require("../models");
const { GuildMember } = require("discord.js");

const permission_roles = require(`../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const roleHierarchy = require("../utilities/role-hierarchy.js");

const sharp = require("sharp");
const { loadImage } = require("@napi-rs/canvas");
const client = require("../client.js");

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
			const paddedName = (player.summoner_name + "#" + player.tag_line)?.padEnd(
				32,
				"\u0020"
			);
			const emojis =
				`${LeagueRoleEmojis[player.primary_role]}${
					LeagueRankEmojis[ranks.get(player.user_id).toUpperCase()]
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

/**
 *
 * @param {string} imagePath
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Canvas.Image>}
 */
async function prepareImage(imagePath, width, height) {
	const resizedImage = await sharp(imagePath).resize(width, height).toBuffer();
	const img = await loadImage(resizedImage);
	return img;
}

function identifyScript(char) {
	const codePoint = char.charCodeAt(0); // For simplicity, checking only the first character

	// Korean (Hangul)
	if (
		(codePoint >= 0xac00 && codePoint <= 0xd7af) ||
		(codePoint >= 0x1100 && codePoint <= 0x11ff)
	) {
		return "Korean";
	}
	// Chinese (simplified check, includes Kanji)
	else if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
		return "Chinese/Japanese Kanji";
	}
	// Japanese Hiragana
	else if (codePoint >= 0x3040 && codePoint <= 0x309f) {
		return "Japanese Hiragana";
	}
	// Japanese Katakana
	else if (codePoint >= 0x30a0 && codePoint <= 0x30ff) {
		return "Japanese Katakana";
	}
	// Arabic
	else if (
		(codePoint >= 0x0600 && codePoint <= 0x06ff) ||
		(codePoint >= 0x0750 && codePoint <= 0x077f)
	) {
		return "Arabic";
	}
	// If not any specific language
	else {
		return "Other";
	}
}

function countScriptCharacters(text) {
	let count = 0;

	for (let i = 0; i < text.length; i++) {
		const script = identifyScript(text[i]);
		if (script !== "Other") {
			count++;
		}
	}

	return count;
}

async function updateClientChannels() {
	const serverChannels = await ServerChannel.findAll();
	client.serverChannels = serverChannels;
}

module.exports = {
	hasRequiredRole,
	hasRequiredRoleOrHigher,
	generateTeamPlayerList,
	formatDateToMMDDYYYY,
	calculateEloChange,
	prepareImage,
	identifyScript,
	countScriptCharacters,
	updateClientChannels,
};
