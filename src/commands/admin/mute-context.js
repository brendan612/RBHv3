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
const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
} = require("discord.js");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Mute")
		.setType(ApplicationCommandType.User),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const targeted_user = await User.findOne({
			where: { user_id: interaction.targetUser.id },
		});
		const current_date = new Date();
		const expiration_date = new Date(current_date.getTime() + ms("1d"));

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
			"Muted by context menu"
		);

		await interaction.reply({
			content: `User <@${
				targeted_user.user_id
			}> has been muted until ${displayDateAsTimestamp(
				expiration_date,
				TimestampFormat.Default
			)}`,
			ephemeral: false,
		});
	},
};
