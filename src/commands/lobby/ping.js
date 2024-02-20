const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	User,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Ping the players in a lobby")
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

		const users = await lobby.getUsers();

		const userString = users.map((user) => `<@${user.user_id}>`).join("\n");
		await interaction.reply({
			content: userString,
		});

		interaction.channel.permissionOverwrites.cache.forEach((permission) => {
			if (permission.type === 1) {
				permission.delete();
			}
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
		} else if (focusedValue.name === "lobby") {
			await lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
