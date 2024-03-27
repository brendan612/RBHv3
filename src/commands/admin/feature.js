const { SlashCommandBuilder, Interaction } = require("./index.js");
const { FeatureToggle } = require("../../models/index.js");
const { Op } = require("sequelize");
const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("feature")
		.setDescription("Toggle a server feature on or off")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create-toggle")
				.setDescription("Create a new feature toggle")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Name of the feature")
						.setRequired(true)
				)
				.addBooleanOption((option) =>
					option
						.setName("enabled")
						.setDescription("Enable or disable the feature")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("toggle")
				.setDescription("Toggle a server feature")
				.addStringOption((option) =>
					option
						.setName("feature")
						.setDescription("Name of the feature")
						.setRequired(true)
						.setAutocomplete(true)
				)
				.addBooleanOption((option) =>
					option
						.setName("enabled")
						.setDescription("Enable or disable the feature")
						.setRequired(true)
				)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create-toggle") {
			const name = interaction.options.getString("name");
			const enabled = interaction.options.getBoolean("enabled");

			const feature = await FeatureToggle.create({
				name: name,
				enabled: enabled,
			});

			await interaction.reply({
				content: `Feature \`\`${feature.name}\`\` has been created and is now ${
					enabled ? "enabled." : "disabled."
				}`,
				ephemeral: true,
			});
		} else {
			const featureId = interaction.options.getString("feature");
			const enabled = interaction.options.getBoolean("enabled");

			const feature = await FeatureToggle.findByPk(featureId);
			if (!feature) {
				return interaction.reply({
					content: "Feature not found",
					ephemeral: true,
				});
			}

			await feature.update({ enabled: enabled });

			client.features.set(feature.name, enabled);

			await interaction.reply({
				content: `Feature \`\`${feature.name}\`\` is now ${
					enabled ? "enabled." : "disabled."
				}`,
				ephemeral: true,
			});
		}
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "feature") {
			let features = null;
			if (focusedValue.value.length === 0) {
				features = await FeatureToggle.findAll();
			} else {
				features = await FeatureToggle.findAll({
					where: {
						name: {
							[Op.iLike]: `%${focusedValue.value}%`,
						},
					},
				});
			}
			await interaction.respond(
				features.map((feature) => ({
					name: `${feature.name}: ${feature.enabled ? "Enabled" : "Disabled"}`,
					value: feature.id.toString(),
				}))
			);
		}
	},
};
