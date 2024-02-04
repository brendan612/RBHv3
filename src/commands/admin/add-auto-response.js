const { SlashCommandBuilder, Interaction } = require("./index.js");
const { AutoResponse } = require("../../models");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("add-auto-response")
		.setDescription("Add text-based auto response'")
		.addStringOption((option) =>
			option
				.setName("trigger")
				.setDescription("The trigger for the auto response")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("response")
				.setDescription("The response to the trigger")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const trigger = interaction.options.getString("trigger");
		const response = interaction.options.getString("response");

		const created_by = interaction.user.id;
		const autoResponse = await AutoResponse.create({
			trigger,
			response,
			created_by,
		});

		await interaction.reply({
			content: `Auto response added.\nTrigger: \`\`${autoResponse.trigger}\`\` \nResponse: \`\`${autoResponse.response}\`\``,
		});
	},
};
