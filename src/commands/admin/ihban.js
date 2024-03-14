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

const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ihban")
		.setDescription("Ban a user from playing inhouses")
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
		const current_date = new Date();
		const expiration_date = new Date(current_date.getTime() + duration);

		const userService = await UserService.createUserService(
			interaction.options.getUser("target").id
		);
		const { isBanned, remaining, reason } = await userService.isIHBanned();

		if (isBanned) {
			await interaction.reply({
				content: `<@${
					userService.user_id
				}> is already banned from inhouses\r\nExpires ${displayDateAsTimestamp(
					remaining,
					TimestampFormat.Relative
				)}\nReason: ${reason}`,
				ephemeral: false,
			});
			return;
		}

		await userService.ihban(
			interaction.user.id,
			expiration_date,
			interaction.options.getString("reason")
		);

		await interaction.reply({
			content: `User <@${
				userService.user_id
			}> has been banned from inhouses until ${displayDateAsTimestamp(
				expiration_date,
				TimestampFormat.Default
			)} for reason: ${interaction.options.getString("reason")}`,
			ephemeral: false,
		});
	},
};
