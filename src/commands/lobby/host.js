const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	generateEmbed,
	Lobby,
	User,
	Game,
} = require("./index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("host")
		.setDescription("Host a lobby")
		.addStringOption((option) => gameOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const lobby = await Lobby.createLobby(interaction.member.id, game.game_id);
		const host = await User.getUser(interaction.member.id);

		const { embed, components } = await lobby.generateEmbed(
			interaction.client,
			interaction.member,
			false
		);

		const response = await interaction.reply({
			embeds: [embed],
			components: [components],
			ephemeral: false,
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
		}
	},
};
