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

module.exports = {
	data: new SlashCommandBuilder()
		.setName("invite")
		.setDescription("Get a list of players in a lobby for inviting.")
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

		const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

		let userString = "";

		for (const user of lobbyDTO.players) {
			userString += `${user.user_id}\n`;
		}

		await interaction.reply({
			content: "```" + userString + "```",
			ephemeral: true,
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
		} else if (focusedValue.name === "lobby") {
			await lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
