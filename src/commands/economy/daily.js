const { ActionRowBuilder } = require("discord.js");
const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const { calculateDailyBoostMoney } = require("../../utilities/economy.js");
const { baseEmbed } = require("../../components/embed.js");
const ms = require("ms");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("daily")
		.setDescription("Collect your daily reward!"),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const now = new Date();
		// Convert the current UTC time to PST by subtracting 8 hours
		now.setUTCHours(now.getUTCHours() - 8);
		const user = await User.findOne({
			where: { user_id: interaction.member.id },
		});
		const userLastDailyDate = new Date(user.last_daily_date);
		userLastDailyDate.setUTCHours(userLastDailyDate.getUTCHours() - 8);

		const alreadyUsedDaily =
			now.getUTCFullYear() === userLastDailyDate.getUTCFullYear() &&
			now.getUTCMonth() === userLastDailyDate.getUTCMonth() &&
			now.getUTCDate() === userLastDailyDate.getUTCDate();
		if (alreadyUsedDaily) {
			await interaction.reply({
				content: `You've already collected your daily reward! Try again later.`,
				ephemeral: true,
			});
		} else {
			user.last_daily_date = now;

			const dailyMoney = calculateDailyBoostMoney(
				interaction.guild,
				interaction.member
			);
			user.server_money += dailyMoney;
			await user.save();

			const embed = baseEmbed(
				"Daily Reward",
				`You have received ${dailyMoney} :pound: for claiming your daily reward!\n`,
				false
			);
			await interaction.reply({
				embeds: [embed],
				ephemeral: false,
			});
		}
	},
};
