const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	Season,
} = require("./index.js");

const {
	generateVeteransImage,
} = require("../../dataManager/messages/veteransImage.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("veterans")
		.setDescription("Players with the most matches played")
		.addStringOption(gameOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		const season = await Season.getCurrentSeason(game.game_id);

		const attachment = await generateVeteransImage(game, season);

		return interaction.reply({
			files: [attachment],
		});
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			await gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "season") {
			await seasonAutocomplete(focusedValue.value, interaction);
		}
	},
};
