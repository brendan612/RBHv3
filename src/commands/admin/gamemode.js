const { SlashCommandBuilder, Interaction } = require("./index.js");
const {
	gameOption,
	gameAutocomplete,
	handleGameOption,
} = require("./index.js");
const { GameMode } = require("../../models/index.js");
const { Op } = require("sequelize");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("gamemode")
		.setDescription("Manage game modes")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new game mode")
				.addStringOption(
					gameOption("game", "The game to create the game mode for", true)
				)
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Name of the game mode")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("toggle")
				.setDescription("Toggle a game mode")
				.addStringOption(
					gameOption("game", "The game to toggle the game mode for", true)
				)
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Name of the game mode")
						.setRequired(true)
						.setAutocomplete(true)
				)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create") {
			const game = await handleGameOption(interaction);
			const name = interaction.options.getString("name");

			await GameMode.create({
				game_id: game.game_id,
				name: name,
			});

			await interaction.reply({
				content: `Game mode \`\`${name}\`\` has been created for game \`\`${game.name}\`\``,
			});
		} else if (interaction.options.getSubcommand() === "toggle") {
			const game = await handleGameOption(interaction);
			const name = interaction.options.getString("name");

			const gamemode = await GameMode.findOne({
				where: {
					game_id: game.game_id,
					name: name,
				},
			});

			gamemode.enabled = !gamemode.enabled;
			await gamemode.save();

			await interaction.reply({
				content: `Game mode has been toggled ${
					gamemode.enabled ? "on" : "off"
				}`,
			});
		}
	},

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "name") {
			let gamemodes = null;
			if (focusedValue.value.length > 0) {
				gamemodes = await GameMode.findAll({
					where: {
						name: {
							[Op.iLike]: `%${focusedValue.value}%`,
						},
					},
				});
			} else {
				gamemodes = await GameMode.findAll();
			}

			await interaction.respond(
				gamemodes.map((gamemode) => ({
					name: gamemode.name,
					value: gamemode.game_mode_id.toString(),
				}))
			);
		}
	},
};
