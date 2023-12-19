const {
	SlashCommandBuilder,
	Interaction,
	User,
	ModerationLog,
} = require("./index.js");
const { userOption } = require("../lobby/index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ihunban")
		.setDescription("Unban a user from playing inhouses")
		.addUserOption(userOption("target", "Targeted User", true))
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for ban")
				.setRequired(false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user_id = interaction.options.getUser("target").id;
		const targeted_user = await User.findOne({ where: { user_id: user_id } });

		if (!targeted_user.isIHBanned()) {
			await interaction.reply({
				content: `<@${targeted_user.user_id}> is not banned from inhouses`,
				ephemeral: true,
			});
			return;
		}

		await targeted_user.ihunban(
			interaction.member.id,
			interaction.options.getString("reason")
		);

		await interaction.reply({
			content: `<@${targeted_user.user_id}> has been unbanned from inhouses`,
			ephemeral: false,
		});
	},
};
