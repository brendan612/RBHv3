const {
	SlashCommandBuilder,
	Interaction,
	User,
	ModerationLog,
} = require("./index.js");
const { userOption } = require("../lobby/index.js");

const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ihunban")
		.setDescription("Unban a user from playing inhouses")
		.addUserOption(userOption("target", "Targeted User", true))
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for unban")
				.setRequired(false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user_id = interaction.options.getUser("target").id;

		const userService = await UserService.createUserService(user_id);

		const { isBanned, remaining, reason } = await userService.isIHBanned();

		if (!isBanned) {
			await interaction.reply({
				content: `<@${targeted_user.user_id}> is not banned from inhouses`,
				ephemeral: true,
			});
			return;
		}

		await userService.ihunban(
			interaction.user.id,
			interaction.options.getString("reason")
		);

		await interaction.reply({
			content: `<@${targeted_user.user_id}> has been unbanned from inhouses`,
			ephemeral: false,
		});
	},
};
