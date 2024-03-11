const { SlashCommandBuilder, Interaction } = require("./index.js");
const { gameOption, gameAutocomplete } = require("./index.js");
const { Game } = require("../../models/index.js");
const { Op } = require("sequelize");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("game")
		.setDescription("Manage games")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new game")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Name of the game")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("toggle")
				.setDescription("Toggle a game")
				.addStringOption(gameOption("game", "The game to toggle", true))
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create") {
			const name = interaction.options.getString("name");

			const existing = await Game.findOne({
				where: { name: name },
			});

			if (existing) {
				await interaction.reply({
					content: `Game \`\`${name}\`\` already exists.`,
				});
				return;
			}

			await Game.createGame(name);

			await interaction.reply({
				content: `Game \`\`${name}\`\` has been created.`,
			});
		} else if (interaction.options.getSubcommand() === "toggle") {
			const game_id = interaction.options.getString("game");

			const game = await Game.findByPk(game_id);

			game.enabled = !game.enabled;
			await game.save();

			await interaction.reply({
				content: `Game \`\`${game.name}\`\` has been toggled ${
					gamemode.enabled ? "on" : "off"
				}`,
			});
		}
	},

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		}
	},
};
