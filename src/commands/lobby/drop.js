const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	userOption,
	User,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("drop")
		.setDescription("Drop from a lobby")
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption())
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);

		const lobbyService = new LobbyService(lobby);
		await lobbyService.drop(interaction.member.id);

		await interaction.deferReply({ ephemeral: true });
		await interaction.deleteReply();
		return;
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
