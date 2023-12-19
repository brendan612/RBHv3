const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction } = require("discord.js");
const { User } = require("../../models");
const { getRiotAccountByPuuid } = require("../../api/riot/riotApiHandler");
const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("sync-account")
		.setDescription("Sync your RBH Profile with your Riot Account")
		.setDefaultMemberPermissions(),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user = await User.findOne({
			where: { user_id: interaction.member.id },
		});

		if (!user.verified) {
			return await interaction.reply({
				content: "You must be verified to use this command",
				ephemeral: true,
			});
		}

		const userService = new UserService(user);
		const userDTO = await userService.syncUserRiotAccount(user.user_id);

		return await interaction.reply({
			content: `Your server profile has been updated to ${userDTO.summoner_name}#${userDTO.tag_line}`,
			ephemeral: true,
		});
	},
};
