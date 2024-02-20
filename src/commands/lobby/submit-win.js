const {
	SlashCommandBuilder,
	Interaction,
	lobbyOption,
	handleLobbyOption,
	Lobby,
	User,
	Game,
	Draft,
	lobbyAutocomplete,
} = require("./index.js");

const DraftService = require("../../dataManager/services/draftService.js");
const MatchService = require("../../dataManager/services/matchService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("submit-win")
		.setDescription(
			"Submit a match result. This will recalc all matches after this one."
		)
		.addIntegerOption(
			lobbyOption("lobby", "Lobby to submit the winning team for", true)
		)
		.addStringOption((option) =>
			option
				.setName("winning_team")
				.setDescription("The team that won the match")
				.addChoices(
					{
						name: "Red",
						value: "red",
					},
					{
						name: "Blue",
						value: "blue",
					}
				)
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply({
			ephemeral: true,
		});
		const lobby = await handleLobbyOption(interaction);
		const winningTeam = interaction.options.getString("winning_team");

		const draft = await Draft.findByPk(lobby.draft_id);

		const matchService = await MatchService.createMatchService(draft.match_id);
		await matchService.submitWin(winningTeam);

		await interaction.editReply({
			content: `This match win has been submitted for #${lobby.lobby_id}.\n Winning team: ${winningTeam}`,
		});
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "lobby") {
			await lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
