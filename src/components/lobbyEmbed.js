const { EmbedBuilder, GuildMember } = require("discord.js");
const baseEmbed = require("./embed.js");
const { inhouse_icon_url } = require("../../config.json");

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
			text: `Hosted by ${member.nickname} • Lobby ID: ${lobby_id}`,
			iconURL: member.user.displayAvatarURL(),
		})
		.setThumbnail(inhouse_icon_url);
	return embed;
};

/**
 *
 * @param {string[]} players
 * @returns {string}
 */
const generatePlayerListForEmbed = (players) => {
	if (players.length === 0) return "```\u0020```";
	let playerList = "";
	for (let i = 0; i < players.length; i++) {
		playerList += `${i + 1 < 10 ? "\u0020" : ""}${i + 1}. ${players[i]}\n`;
	}
	return `\`\`\`${playerList}\`\`\``;
};

module.exports = { lobbyEmbed, generatePlayerListForEmbed };
