const { ActionRowBuilder } = require("discord.js");
const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const { calculateDailyBoostMoney } = require("../../utilities/economy.js");
const { baseEmbed } = require("../../components/embed.js");
const { userOption } = require("../../components/commandOptions.js");
const ms = require("ms");
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("balance")
		.setDescription("Check your balance or give money to another user")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("check")
				.setDescription("Check your balance or someone else's")
				.addUserOption(userOption())
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("give")
				.setDescription("Give money to another user")
				.addUserOption(userOption("target", "Targeted User", true))
				.addStringOption((option) =>
					option
						.setName("amount")
						.setDescription("Amount of money to give")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("top")
				.setDescription("View the users with the most money on the server")
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "check") {
			const user = await User.findByPk(interaction.user.id);
			const target = interaction.options.getUser("target");

			let userToDisplay = null;
			let message = "";

			if (target) {
				userToDisplay = await User.findByPk(target.id);
				const formatted_server_money = new Intl.NumberFormat(
					"en-US",
					{}
				).format(userToDisplay.server_money);
				message = `<@${userToDisplay.user_id}> has ${formatted_server_money} :pound:`;
			} else {
				userToDisplay = user;
				const formatted_server_money = new Intl.NumberFormat(
					"en-US",
					{}
				).format(userToDisplay.server_money);
				message = `You have ${formatted_server_money} :pound:`;
			}

			const embed = baseEmbed("Balance", message, false);

			return interaction.reply({
				embeds: [embed],
			});
		} else if (interaction.options.getSubcommand() === "give") {
			const user = await User.findByPk(interaction.user.id);
			const target = interaction.options.getUser("target");
			const amount = parseInt(interaction.options.getString("amount"));

			const isAdmin = hasRequiredRoleOrHigher(interaction.member, "admin");

			if (amount > BigInt(user.server_money) && !isAdmin) {
				return interaction.reply({
					content: "You do not have enough money to give that amount.",
					ephemeral: true,
				});
			}

			const targetUser = await User.findByPk(target.id);

			if (targetUser.user_id === user.user_id && !isAdmin) {
				return interaction.reply({
					content: "You cannot give money to yourself.",
					ephemeral: true,
				});
			}

			if (amount < 1 && !isAdmin) {
				return interaction.reply({
					content: "You cannot give less than 1 :pound:",
					ephemeral: true,
				});
			}

			if (!isAdmin) {
				user.server_money -= amount;
				await user.save();
			}

			targetUser.server_money += amount;
			await targetUser.save();

			const embed = baseEmbed(
				"Balance",
				`You have given <@${target.id}> ${amount} :pound:`,
				false
			);

			return interaction.reply({
				embeds: [embed],
			});
		} else if (interaction.options.getSubcommand() === "top") {
			const embed = baseEmbed(
				":pound: LEADERBOARD :pound:",
				"Users with the most money."
			);

			const users = await User.findAll({
				order: [["server_money", "DESC"]],
				limit: 10,
			});

			let userString = "";

			for (const user of users) {
				const formatted_server_money = new Intl.NumberFormat(
					"en-US",
					{}
				).format(user.server_money);
				userString += `<@${user.user_id}> | ${formatted_server_money} :pound:\n`;
			}

			embed.setDescription(userString);

			return interaction.reply({
				embeds: [embed],
			});
		}
	},
};
