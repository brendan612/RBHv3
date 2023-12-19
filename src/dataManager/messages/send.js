const {
	ThreadChannel,
	Message,
	EmbedBuilder,
	ActionRowBuilder,
	GuildMember,
	TextChannel,
} = require("discord.js");

/**
 *
 * @param {TextChannel|ThreadChannel} channel
 * @param {string} message
 * @param {EmbedBuilder} embed
 * @param {ActionRowBuilder} components
 * @param {boolean} ephemeral
 * @returns {Message}
 */
async function sendMessage(
	channel,
	message,
	embed,
	components,
	ephemeral = false
) {
	const message = await channel.send({
		content: message,
		embeds: [embed],
		components: components,
		ephemeral: ephemeral,
	});
	return message;
}

/**
 *
 * @param {GuildMember} user
 * @param {Message} message
 * @param {EmbedBuilder} embed
 * @param {ActionRowBuilder} components
 * @param {boolean} ephemeral
 * @returns
 */
async function sendDirectMessage(
	user,
	message,
	embed,
	components,
	ephemeral = false
) {
	const message = await user.send({
		content: message,
		embeds: [embed],
		components: components,
		ephemeral: ephemeral,
	});
	return message;
}

/**
 * @param {Interaction} interaction
 * @param {string} message
 * @param {EmbedBuilder} embed
 * @param {ActionRowBuilder} components
 * @param {boolean} ephemeral
 * @returns {Message}
 */
async function sendReply(
	interaction,
	message,
	embed,
	components,
	ephemeral = false
) {
	const message = await interaction.reply({
		content: message,
		embeds: [embed],
		components: components,
		ephemeral: ephemeral,
	});
	return message;
}

/**
 * @param {Interaction} interaction
 * @param {string} message
 * @param {EmbedBuilder} embed
 * @param {ActionRowBuilder} components
 * @returns {Message}
 */
async function sendFollowUp(interaction, message, embed, components) {
	const message = await interaction.followUp({
		content: message,
		embeds: [embed],
		components: components,
	});
	return message;
}

module.exports = { sendMessage, sendDirectMessage, sendReply, sendFollowUp };
