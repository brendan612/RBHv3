const { ActionRowBuilder } = require("discord.js");
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
} = require("../../utilities/utility-functions.js");
const { baseEmbed } = require("../../components/embed.js");
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

		const logs = await ModerationLog.findAll({
			where: {
				targeted_user_id: user.user_id,
				type: {
					[Op.in]: ["IHBAN", "MUTE"],
				},
			},
			order: [["created_at", "ASC"]],
		});

		const formatted = logs.map((log) => {
			return `\`\`${log.type} | ${log.reason} | ${formatDateDifference(
				log.duration,
				log.created_at
			)}\`\``;
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

		return await interaction.reply({ embeds: [embed] });
	},
};
