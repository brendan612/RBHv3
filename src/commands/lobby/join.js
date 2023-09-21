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
		.setName("join")
		.setDescription("Join a lobby")
		.addStringOption((option) => gameOption())
		.addIntegerOption((option) => lobbyOption()),
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
				content: "No open lobbies found.",
				ephemeral: true,
			});
			return;
		}

		let user = await User.findOne({
			where: { user_id: interaction.member.id },
		});

		//create user if not found. temporary until i make verify command
		if (!user) {
			user = await User.create({
				user_id: interaction.member.id,
				join_date: interaction.member.joinedAt,
				summoner_name: interaction.member.nickname,
			});
		}

		const lobbyUsers = await lobby.getUsers();
		//check if lobby is full
		if (lobbyUsers.length >= 13) {
			await interaction.reply({
				content: "Lobby is full",
				ephemeral: true,
			});
			return;
		}
		//check if user is already in lobby
		if (lobbyUsers.some((lobbyUser) => lobbyUser.user_id === user.user_id)) {
			await interaction.reply({
				content: "You are already in this lobby.",
				ephemeral: true,
			});
			return;
		}

		await lobby.addUser(user);

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
