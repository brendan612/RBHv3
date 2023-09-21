const { EmbedBuilder } = require("discord.js");
const { server_icon_url } = require("../../config.json");

const baseEmbed = (title, description) => {
	return new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor("#a10003")
		.setAuthor({ iconURL: server_icon_url, name: "Queen's Croquet" });
};

module.exports = { baseEmbed };
