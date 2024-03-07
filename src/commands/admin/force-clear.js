const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
	Match,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("force-clear")
		.setDescription(
			"Clear a lobby. Can be used to clear a lobby that has already been played."
		)
		.addStringOption(gameOption("game", "Available Games", true, true))
		.addIntegerOption(lobbyOption("lobby", "Lobby ID", true, true)),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);

		if (lobby) {
			await interaction.reply({
				content: `Lobby #${lobby.lobby_id} has been cleared.`,
			});

			client.cache.clear("lobby_id_" + lobby.lobby_id);

			const lobbyService = new LobbyService(lobby);
			await lobbyService.destroyLobby();
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
