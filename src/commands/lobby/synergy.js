const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	seasonAutocomplete,
	gameOption,
	lobbyOption,
	User,
	handleGameOption,
	handleLobbyOption,
	userOption,
	handleUserOption,
	seasonOption,
	handleSeasonOption,
	baseEmbed,
} = require("./index.js");
const {
	getSynergyStatsForUsers,
} = require("../../dataManager/queries/stats/stats.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("synergy")
		.setDescription("View the synergy between two players.")
		.addUserOption(userOption("player1", "Player 1", true))
		.addUserOption(userOption("player2", "Player 2", false))
		.addStringOption(gameOption())
		.addStringOption(seasonOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply();
		const game = await handleGameOption(interaction);
		const season = await handleSeasonOption(interaction, game.game_id);
		const player1 = await handleUserOption(interaction, "player1");
		const player2 = await handleUserOption(interaction, "player2");

		if (player1.user_id === player2.user_id) {
			return await interaction.editReply({
				content: "Why did you try this?",
			});
		}

		const { winsWith, winsAgainst, lossesWith, lossesAgainst } =
			await getSynergyStatsForUsers(
				player1.user_id,
				player2.user_id,
				game.game_id,
				season?.season_id
			);

		const embed = baseEmbed(
			"Queen's Croquet Synergy Report",
			"Description",
			false
		);

		if (season) {
			embed.setDescription("Stats for Season #" + season.season_game_id);
		} else {
			embed.setDescription("All-Time Stats");
		}

		embed.addFields({
			name: `:heart: ${player1.displayName()} with ${player2.displayName()}`,
			value: `${winsWith}W ${lossesWith}L`,
			inline: true,
		});

		embed.addFields({
			name: `:crossed_swords: ${player1.displayName()} vs ${player2.displayName()}`,
			value: `${winsAgainst}W ${lossesAgainst}L`,
			inline: true,
		});

		await interaction.editReply({
			embeds: [embed],
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
		} else if (focusedValue.name === "season") {
			await seasonAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			await lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
