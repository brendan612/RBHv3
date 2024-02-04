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
const { err } = require("@sapphire/framework");

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
		await interaction.deferReply({ ephemeral: true });

		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby && !interaction.responded) {
			await interaction.editReply({
				content: "Not a valid lobby",
				ephemeral: true,
			});
			return;
		}

		const lobbyService = new LobbyService(lobby);

		if (interaction.user.id !== lobby.host_id) {
			return await interaction.editReply({
				content: "Only the host can start the draft.",
				ephemeral: true,
			});
		}

		try {
			const { draftable, reason } = await lobbyService.draft();
			if (!draftable) {
				return await interaction.editReply({
					content: reason,
					ephemeral: true,
				});
			}
		} catch (error) {
			console.error(error);
			return await interaction.editReply({
				content: error.message,
				ephemeral: true,
			});
		}

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
