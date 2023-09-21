const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	userOption,
	User,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("drop")
		.setDescription("Drop from a lobby")
		.addStringOption((option) => gameOption())
		.addIntegerOption((option) => lobbyOption())
		.addUserOption((option) => userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);

		if (!lobby) {
			await interaction.reply({
				content: "You are not in any open lobbies.",
				ephemeral: true,
			});
			return;
		}

		let user_id = null;
		const target = interaction.options.getUser("target");
		if (target) {
			user_id = target.id;
		} else {
			await User.findOne({
				where: { user_id: interaction.member.id },
			}).then((user) => {
				user_id = user.user_id;
			});
		}

		const lobbyUsers = await lobby.getUsers();
		//check if user is not in lobby
		if (!lobbyUsers.some((user) => user.user_id === user_id)) {
			const content =
				user_id === interaction.member.id
					? "You are not in any open lobbies."
					: "User is not in any open lobbies.";
			return await interaction.reply({
				content: content,
				ephemeral: true,
			});
		}

		await lobby.removeUser(user_id);

		const host = await interaction.client.guild.members.fetch(lobby.host_id);

		await lobby.generateEmbed(interaction.client, host, true);

		await interaction.deferReply({ ephemeral: true });
		await interaction.deleteReply();
		return;
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
