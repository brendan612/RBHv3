const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const ms = require("ms");
const { ModerationLog } = require("../admin/index.js");
const { Op } = require("sequelize");
const { baseEmbed } = require("../../components/embed.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ihbanned")
		.setDescription("Get a list of banned users from inhouses"),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const banned_users = await ModerationLog.findAll({
			where: {
				type: "IHBAN",
				duration: {
					[Op.gt]: new Date(),
				},
			},
		});

		const embed = baseEmbed("Banned Users", "Users banned from inhouses");
		const banned_users_string = banned_users.map((user) => {
			const timestamp = Math.floor(new Date(user.duration).getTime() / 1000); //divide by 1000 to convert to seconds
			return `<@${user.user_id}> | Expires <t:${Math.floor(timestamp)}:R>\n`;
		});
		embed.addFields({
			name: "\r",
			value: banned_users_string.join(""),
		});
		await interaction.reply({
			embeds: [embed],
			ephemeral: false,
		});
	},
};
