const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	Lobby,
	User,
	Game,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const {
	generateLobbyEmbed,
} = require("../../dataManager/messages/lobbyEmbed.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("host")
		.setDescription("Host a lobby")
		.addStringOption(gameOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild

		await interaction.deferReply();
		const game = await handleGameOption(interaction);
		const lobby = await LobbyService.createLobby(
			interaction.member.id,
			game.game_id
		);
		const lobbyService = new LobbyService(await Lobby.findByPk(lobby.lobby_id));
		await lobbyService.addUser(interaction.member.id);
		await lobbyService.generateLobbyEmbed(
			await LobbyService.getLobby(lobby.lobby_id),
			true
		);
		await interaction.deleteReply();
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			await gameAutocomplete(focusedValue.value, interaction);
		}
	},
};
