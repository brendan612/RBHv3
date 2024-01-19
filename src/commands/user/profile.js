const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction } = require("discord.js");
const UserService = require("../../dataManager/services/userService.js");
const { userOption } = require("./index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("profile")
		.setDescription("View your profile or someone else's")
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		let user = interaction.options.getUser("target");
		if (!user) {
			user = interaction.member.user;
		}

		const userService = await UserService.createUserService(user.id);
		await userService.generateProfileEmbed(interaction, user.id);
	},
};
