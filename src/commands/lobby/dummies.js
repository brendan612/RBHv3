const { Op } = require("sequelize");
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
		.setName("dummies")
		.setDescription("Add dummy users to a lobby")
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

		const lobbyUsers = await lobby.getUsers();
		//check if lobby is full
		// const { joinable, reason } = lobby.isJoinable(lobbyUsers.length);
		// console.log(joinable, reason);
		// if (!joinable) {
		// 	await interaction.reply({
		// 		content: reason,
		// 		ephemeral: true,
		// 	});
		// 	return;
		// }

		const dummies = await User.findAll({
			where: {
				user_id: {
					[Op.between]: [1, 10 - lobbyUsers.length],
				},
			},
		});

		-(await lobby.addUsers(dummies));

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
