const { SlashCommandBuilder, Interaction, Sequelize } = require("./index.js");
const { AutoResponse } = require("../../models");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("remove-auto-response")
		.setDescription("Remove text-based auto response")
		.addStringOption((option) =>
			option
				.setName("trigger")
				.setDescription("The trigger for the auto response")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const trigger = interaction.options.getString("trigger");

		const autoResponse = await AutoResponse.findOne({
			where: Sequelize.where(
				Sequelize.fn("LOWER", Sequelize.col("trigger")),
				Sequelize.fn("LOWER", trigger)
			),
		});

		if (!autoResponse) {
			await interaction.reply({
				content: `Auto response not found for trigger \`\`${trigger}\`\``,
			});
			return;
		}

		try {
			await autoResponse.destroy();
		} catch (err) {
			await interaction.reply({
				content: `Error removing auto response for trigger \`\`${trigger}\`\``,
			});
			return;
		}

		await interaction.reply({
			content: `Auto response removed for trigger \`\`${trigger}\`\``,
		});
	},
};
