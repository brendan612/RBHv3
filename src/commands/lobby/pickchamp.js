const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	championAutocomplete,
	gameOption,
	lobbyOption,
	championOption,
	handleGameOption,
	handleLobbyOption,
	Lobby,
	Draft,
	handleChampionOption,
} = require("./index.js");

const DraftService = require("../../dataManager/services/draftService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");
const ChampionDraftService = require("../../dataManager/services/championDraftService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("pickchamp")
		.setDescription("Pick a champion for your team during Champion Select")
		.addStringOption(championOption())
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby) return;

		if (!lobby.draft_id) {
			return interaction.reply({
				content: "This lobby has not started drafting yet",
				ephemeral: true,
			});
		}

		const champion = await handleChampionOption(interaction, lobby.draft_id);
		if (!champion) return;

		await interaction.deferReply({ ephemeral: true });

		const draft = await Draft.findByPk(lobby.draft_id);
		const championDraftService = new ChampionDraftService(draft);
		await championDraftService.handleChampSelect(interaction, champion, "pick");
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "champion") {
			championAutocomplete(focusedValue.value, interaction);
		}
	},
};
