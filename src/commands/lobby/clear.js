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
		.setName("clear")
		.setDescription("Clear a lobby")
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption()),
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
			const match = await Match.findByPk(lobby.match_id);
			if (match && match.end_time) {
				await interaction.reply({
					content: `Lobby #${lobby.lobby_id} has already been played and cannot be cleared.`,
				});
				return;
			}
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
