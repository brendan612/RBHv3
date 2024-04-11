const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	ModerationLog,
	userOption,
	handleUserOption,
} = require("./index.js");
const { Op } = require("sequelize");

const {
	formatDateDifference,
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

const {
	displayDateAsTimestamp,
	TimestampFormat,
} = require("../../utilities/timestamp.js");

const { baseEmbed } = require("../../components/embed.js");

const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("offense-history")
		.setDescription("Get a offense history of a user. Will default to yourself")
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user = await handleUserOption(interaction, "target");

		const userService = await UserService.createUserService(user.user_id);
		const logs = await ModerationLog.findAll({
			where: {
				targeted_user_id: user.user_id,
				type: {
					[Op.in]: ["IHBAN", "MUTE"],
				},
			},
			order: [["created_at", "DESC"]],
		});

		const formatted = logs.map((log) => {
			return `${displayDateAsTimestamp(
				log.created_at,
				TimestampFormat.ShortDate
			)} | **${log.type}** | ${log.reason} | ${formatDateDifference(
				log.duration,
				log.created_at
			)}`;
		});

		const embed = baseEmbed(
			"Offense History",
			`All offenses for <@${user.user_id}>`
		);

		if (!logs.length) {
			embed.addFields({
				name: "\u200b",
				value: "**This user is squeaky clean :)**",
			});
		} else {
			embed.addFields({
				name: "Offenses",
				value: formatted.join("\n"),
			});
		}

		const components = [];
		const isIHBanned = await userService.isIHBanned();
		//prettier-ignore
		if (isIHBanned.isBanned && hasRequiredRoleOrHigher(interaction.member, "moderator")) {
			const unban = new ButtonBuilder()
				.setCustomId(`unban_${user.user_id}`)
				.setLabel("Unban")
				.setStyle(ButtonStyle.Danger);
			
			const row = new ActionRowBuilder().addComponents(unban);
			components.push(row);

			return await interaction.reply({
				embeds: [embed],
				components: components,
			});
		}

		return await interaction.reply({
			embeds: [embed],
		});
	},
};
