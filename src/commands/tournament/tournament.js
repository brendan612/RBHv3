const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	User,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");

const {
	tournamentCreateSubCommand,
	handleTournamentCreate,
	generateTournamentCreateModal,
} = require("./tournament-subcommands/create.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("tournament")
		.setDescription("Manage tournaments")
		.addSubcommand(tournamentCreateSubCommand()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create") {
			await generateTournamentCreateModal(interaction);
		}
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			await gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			await lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
