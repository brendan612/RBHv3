const {
	SlashCommandBuilder,
	Interaction,
	User,
	ModerationLog,
} = require("./index.js");
const ms = require("ms");
const { userOption } = require("../lobby/index.js");
const {
	TimestampFormat,
	displayDateAsTimestamp,
} = require("../../utilities/timestamp.js");
const { re } = require("mathjs");
const { Op } = require("sequelize");
const { ActionType } = require("../../components/moderationActionTypeEnum.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("mute")
		.setDescription("Mute a user")
		.addUserOption(userOption("target", "Targeted User", true))
		.addStringOption((option) =>
			option
				.setName("length")
				.setDescription("Length of ban. EX: 1d, 1w, 1m, 1y, 1d1h1m1s, etc.")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setDescription("Reason for ban")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const duration = ms(interaction.options.getString("length"));
		const user_id = interaction.options.getUser("target").id;
		const targeted_user = await User.findOne({ where: { user_id: user_id } });
		const current_date = new Date();
		const expiration_date = new Date(current_date.getTime() + duration);

		if (await targeted_user.isMuted()) {
			const mute = await ModerationLog.findOne({
				where: {
					targeted_user_id: targeted_user.user_id,
					type: ActionType.MUTE,
					duration: {
						[Op.gt]: new Date(),
					},
				},
				order: [["created_at", "DESC"]],
			});
			const remaining = new Date(mute.duration);
			await interaction.reply({
				content: `<@${
					targeted_user.user_id
				}> is already muted. \r\nExpires ${displayDateAsTimestamp(
					remaining,
					TimestampFormat.Relative
				)}`,
				ephemeral: true,
			});
			return;
		}
		await targeted_user.mute(
			interaction.member.id,
			expiration_date,
			interaction.options.getString("reason")
		);

		await interaction.reply({
			content: `User <@${
				targeted_user.user_id
			}> has been muted until ${displayDateAsTimestamp(
				expiration_date,
				TimestampFormat.Default
			)} for reason: ${interaction.options.getString("reason")}`,
			ephemeral: false,
		});
	},
};
