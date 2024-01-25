const { EmbedBuilder } = require("discord.js");
const {
	server_icon_url,
	inhouse_icon_url,
} = require(`../../${process.env.CONFIG_FILE}`);

/**
 *
 * @param {string} title
 * @param {string} description
 * @param {boolean} useThumbnail default true
 * @param {string} author default "Queen's Croquet"
 * @returns {EmbedBuilder}
 */
const baseEmbed = (
	title,
	description,
	useThumbnail = true,
	author = "Queen's Croquet"
) => {
	let embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor("#a10003")
		.setAuthor({ iconURL: server_icon_url, name: author });
	if (useThumbnail) embed.setThumbnail(inhouse_icon_url);
	return embed;
};

module.exports = { baseEmbed };
