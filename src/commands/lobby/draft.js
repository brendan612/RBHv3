const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
	generateEmbed,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const DraftService = require("../../dataManager/services/draftService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("draft")
		.setDescription("Draft a lobby")
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby && !interaction.responded) {
			await interaction.reply({
				content: "Not a valid lobby",
				ephemeral: true,
			});
			return;
		}

		const lobbyService = new LobbyService(lobby);

		const draftable = await lobbyService.isDraftable();
		if (!draftable.isDraftable) {
			return await interaction.reply({
				content: draftable.reason,
				ephemeral: true,
			});
		}

		await lobbyService.closeLobby();

		const draft = await DraftService.createDraft(lobby.lobby_id);
		const draftService = new DraftService(draft);
		await draftService.startPlayerDraft();

		const host = await interaction.guild.members.fetch(lobby.host_id);

		await lobby.generateDraftEmbed(interaction.client, host, true);

		await interaction.deferReply();
		await interaction.deleteReply();
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
