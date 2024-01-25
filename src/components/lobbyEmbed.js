const { EmbedBuilder, GuildMember } = require("discord.js");
const { baseEmbed } = require("./embed.js");
const { inhouse_icon_url } = require(`../../${process.env.CONFIG_FILE}`);
const { LeagueRankEmojis, LeagueRoleEmojis } = require("../assets/emojis.js");

/**
 *
 * @param {string} title
 * @param {string} description
 * @param {GuildMember} member
 * @param {number} lobby_id
 * @returns {EmbedBuilder}
 */
const lobbyEmbed = (title, description, member, lobby_id) => {
	const embed = baseEmbed(title, description);
	embed
		.setFooter({
			text: `Hosted by ${
				member.nickname ?? member.user.globalName
			} • Lobby ID: ${lobby_id}`,
			iconURL: member.user.displayAvatarURL(),
		})
		.setThumbnail(inhouse_icon_url);
	return embed;
};

/**
 *
 * @param {User[]} players
 * @returns {string}
 */
const generatePlayerListForEmbed = (players) => {
	if (players.length === 0) return "```\u0020```";
	let playerList = "";
	for (let i = 0; i < players.length; i++) {
		let player = `${players[i]}`;
		playerList += `${i + 1 < 10 ? "\u0020" : ""}${i + 1}. ${player}\n`;
	}
	return playerList;
};

const generatePlayerRolesListForEmbed = (players, roles) => {
	if (players.length === 0) return "";
	let playerList = "";
	for (let i = 0; i < players.length; i++) {
		playerList += `${getRandomValue(LeagueRoleEmojis)}${getRandomValue(
			LeagueRoleEmojis
		)}\n`;
	}
	return playerList;
};

const generatePlayerRanksListForEmbed = (players, ranks) => {
	if (players.length === 0) return "";
	let playerList = "";
	for (let i = 0; i < players.length; i++) {
		playerList += `${getRandomValue(LeagueRankEmojis)}\n`;
	}
	return playerList;
};

function getRandomValue(obj) {
	const keys = Object.keys(obj);
	const randomIndex = Math.floor(Math.random() * keys.length);
	const randomKey = keys[randomIndex];
	return obj[randomKey];
}

module.exports = {
	lobbyEmbed,
	generatePlayerListForEmbed,
	generatePlayerRanksListForEmbed,
	generatePlayerRolesListForEmbed,
};
