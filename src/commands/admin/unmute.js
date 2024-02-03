const {
	SlashCommandBuilder,
	Interaction,
	User,
	ModerationLog,
} = require("./index.js");
const { userOption } = require("../lobby/index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("unmute")
		.setDescription("Unmute a user")
		.addUserOption(userOption("target", "Targeted User", true))
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for unmute")
				.setRequired(false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user_id = interaction.options.getUser("target").id;
		const targeted_user = await User.findOne({ where: { user_id: user_id } });

		if (!targeted_user.isMuted()) {
			await interaction.reply({
				content: `<@${targeted_user.user_id}> is not muted.`,
				ephemeral: true,
			});
			return;
		}

		await targeted_user.unmute(
			interaction.member.id,
			interaction.options.getString("reason")
		);

		await interaction.reply({
			content: `<@${targeted_user.user_id}> has been unmuted`,
			ephemeral: false,
		});
	},
};
