const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	Referral,
} = require("./index.js");
const { baseEmbed } = require("../../components/embed.js");
const UserService = require("../../dataManager/services/userService.js");
const client = require("../../client.js");
const { Op, Sequelize } = require("sequelize");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("referrals")
		.setDescription("Get a leaderboard of users with the most referrals."),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(
		interaction,
		page = 0,
		pageSize = 10,
		commandInteraction = null
	) {
		commandInteraction = commandInteraction ?? interaction;
		const guild = client.guilds.cache.get(client.guildID);
		let totalReferralCount = await User.count({
			include: [
				{
					model: Referral,
					as: "Referrals",
					attributes: [],
				},
			],
			distinct: true, // Counts the distinct number of Users, not Referrals
			where: {
				"$Referrals.referrer_id$": { [Op.ne]: null }, // Only users who have referrals
			},
		});

		const topReferrers = await UserService.getTopReferrersWithPagination(
			page,
			pageSize
		);

		if (topReferrers.length === 0) {
			return await interaction.reply({
				content: "No users found with referrals.",
				ephemeral: true,
			});
		}
		const embed = baseEmbed(
			"Referral Leaderboard",
			"Users with the most referrals"
		);

		let message = "";
		for (const referrer of topReferrers) {
			try {
				const member = await guild.members.fetch(referrer.user_id);
				message += `${member.displayName.padEnd(30)} ${
					referrer.referralCount
				}\n`;
			} catch {
				const user = await User.findByPk(referrer.user_id);
				message += `${(user.summoner_name
					? user.summoner_name
					: "Unknown User"
				).padEnd(30)} ${referrer.referralCount} \n`;
			}
		}

		embed.addFields({
			name: "\u200b",
			value: "```" + message + "```",
			inline: true,
		});

		if (totalReferralCount > pageSize) {
			const totalPages = Math.ceil(totalReferralCount / pageSize);
			const previousPage = page - 1 >= 0 ? page - 1 : 0;
			const nextPage = page + 1 < totalPages ? page + 1 : totalPages - 1;

			const previousButton = new ButtonBuilder()
				.setCustomId(`referrals_${previousPage}`)
				.setLabel("Previous")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === 0);

			const nextButton = new ButtonBuilder()
				.setCustomId(`referrals_${nextPage}`)
				.setLabel("Next")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(page === totalPages - 1);

			const row = new ActionRowBuilder().addComponents(
				previousButton,
				nextButton
			);

			embed.setFooter({
				text: `Page ${page + 1} of ${totalPages}`,
			});
			let message = null;
			if (commandInteraction === interaction) {
				message = await interaction.reply({
					embeds: [embed],
					components: [row],
				});
			} else {
				message = await commandInteraction.editReply({
					embeds: [embed],
					components: [row],
				});
			}

			try {
				const filter = (i) => i.user.id === interaction.user.id;
				const i = await message.awaitMessageComponent({ filter, time: 60000 });
				const customId = i.customId;
				const split = customId.split("_");
				const page = parseInt(split[1]);
				this.execute(i, page, pageSize, commandInteraction);
			} catch {
				try {
					message.edit({
						embeds: [embed],
						components: [],
					});
				} catch {}
			}
		} else {
			await interaction.reply({ embeds: [embed] });
		}
	},
};
