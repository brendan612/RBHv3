const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	lobbyOption,
	handleLobbyOption,
	handleGameOption,
	userOption,
	handleUserOption,
	Lobby,
	User,
	Game,
	lobbyAutocomplete,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const {
	generateLobbyEmbed,
} = require("../../dataManager/messages/lobbyEmbed.js");
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("sethost")
		.setDescription("Change host of a lobby")
		.addIntegerOption(lobbyOption("lobby", "Lobby to change host of", true))
		.addUserOption(userOption("target", "User to set as host", true)),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const lobby = await handleLobbyOption(interaction);
		const user = await handleUserOption(interaction, "target");

		const host = await User.findByPk(lobby.host_id);

		const canSetHost =
			interaction.member.id === lobby.host_id ||
			hasRequiredRoleOrHigher(interaction.member, "trainee");

		if (!canSetHost) {
			return await interaction.reply({
				content: "Only the host or staff can change the host of the lobby",
				ephemeral: true,
			});
		}

		if (lobby.host_id === user.user_id) {
			return await interaction.reply({
				content: "User is already the host of the lobby",
				ephemeral: true,
			});
		}

		if (host.region !== user.region) {
			return await interaction.reply({
				content: "User is not in the same region as the lobby",
				ephemeral: true,
			});
		}

		const guild = interaction.guild;
		const member = guild.members.cache.get(user.user_id);
		if (!hasRequiredRoleOrHigher(member, "trainee")) {
			return await interaction.reply({
				content: "User does not have the required role to be a host",
				ephemeral: true,
			});
		}

		const lobbyService = new LobbyService(await Lobby.findByPk(lobby.lobby_id));
		const response = await lobbyService.setHost(user.user_id);

		if (response) {
			await interaction.reply({
				content: "Host has been changed",
			});

			await lobbyService.generateLobbyEmbed(
				await LobbyService.getLobby(lobby.lobby_id),
				true
			);
		} else {
			await interaction.reply({
				content: "Failed to change host",
				ephemeral: true,
			});
		}
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
