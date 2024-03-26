const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
} = require("./index.js");
const {
	ServerChannel,
	ServerEmoji,
	ServerRole,
	ServerSetting,
	Sequelize,
} = require("../../models/index.js");

const { gameOption, handleGameOption } = require("../admin");

const { Op } = require("sequelize");
const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("server-channel")
		.setDescription("Manage server channels")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new server channel")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("The type of channel")
						.setRequired(true)
				)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create-setting") {
			const category = interaction.options.getString("category");
			const type = interaction.options.getString("type");
			const name = interaction.options.getString("name");
			const value = interaction.options.getString("value");

			const game = await handleGameOption(interaction, true);
		}
	},
	async autocomplete(interaction) {},
};
