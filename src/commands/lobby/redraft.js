const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

const { Draft } = require("../../models/index");
const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("redraft")
		.setDescription("Redraft a lobby")
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

		const lobbyService = new LobbyService(lobby);
		await lobbyService.redraft();
		await interaction.reply({
			content: `Lobby # ${lobby.lobby_id} will be redrafted.`,
		});

		const draft = await Draft.findByPk(lobby.draft_id);
		const draftDTO = new DraftDTO(draft);
		const playerDraftService = new PlayerDraftService(draft);
		await playerDraftService.generatePlayerDraftEmbed(draftDTO, true);
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
