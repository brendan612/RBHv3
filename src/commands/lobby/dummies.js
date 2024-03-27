const { Op, fn, col } = require("sequelize");
const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	User,
	Lobby,
	handleGameOption,
	handleLobbyOption,
} = require("./index.js");

const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("dummies")
		.setDescription("Add dummy users to a lobby")
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

		const lobbyUsers = await lobby.getUsers();

		const dummies = await User.findAll({
			where: {
				summoner_name: {
					[Op.like]: "Dummy%",
				},
				region_id: lobby.region_id,
			},
			limit: 10 - lobbyUsers.length,
		});

		const lobbyService = new LobbyService(lobby);

		for (const dummy of dummies) {
			await lobbyService.addUser(dummy.user_id);
		}

		await lobbyService.generateLobbyEmbed(
			await LobbyService.getLobby(lobby.lobby_id),
			true
		);

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
