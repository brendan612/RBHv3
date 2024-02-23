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
	handleUserOption,
	Lobby,
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

const {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
} = require("discord.js");

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName("Drop")
		.setType(ApplicationCommandType.User),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const targeted_user = await User.findOne({
			where: { user_id: interaction.targetUser.id },
		});

		const lobby = await Lobby.findOne({
			where: {
				closed_date: null,
				draft_id: null,
				match_id: null,
			},
			include: {
				model: User,
				where: { user_id: targeted_user.user_id },
			},
			order: [["created_at", "ASC"]],
		});

		if (!lobby) {
			await interaction.reply({
				content: `No active lobby found for <@${targeted_user.user_id}>`,
				ephemeral: true,
			});
			return;
		}

		const lobbyService = new LobbyService(lobby);
		await lobbyService.drop(targeted_user.user_id);

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
