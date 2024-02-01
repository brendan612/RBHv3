const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
	Lobby,
	Draft,
	DraftRound,
} = require("./index.js");

const DraftService = require("../../dataManager/services/draftService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const ChampionDraftService = require("../../dataManager/services/championDraftService.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");

const { ChannelType } = require("discord.js");

const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("name-lobby")
		.setDescription("Change the name of a lobby")
		.addIntegerOption(lobbyOption("lobby", "Lobby ID", true, true))
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("Name of the lobby")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const lobby = await handleLobbyOption(interaction);
		if (!lobby) return;

		if (interaction.user.id !== lobby.host_id) {
			return interaction.reply({
				content: "You are not the host of this lobby",
				ephemeral: true,
			});
		}

		const lobbyName = interaction.options.getString("name");
		lobby.lobby_name = lobbyName;
		await lobby.save();

		const lobbyService = new LobbyService(lobby);
		await lobbyService.generateLobbyEmbed(
			await LobbyService.getLobby(lobby.lobby_id),
			true
		);

		return interaction.reply({
			content: `Lobby name has been changed to ${lobbyName}`,
			ephemeral: true,
		});
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
