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

module.exports = {
	data: new SlashCommandBuilder()
		.setName("lobby")
		.setDescription("Display lobby")
		.addStringOption((option) => gameOption())
		.addIntegerOption((option) => lobbyOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby) {
			await interaction.reply({
				content: "Not a valid lobby",
				ephemeral: true,
			});
			return;
		}

		const host = await interaction.client.guild.members.fetch(lobby.host_id);

		await lobby.generateEmbed(interaction.client, host, true);

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
