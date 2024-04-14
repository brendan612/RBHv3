const { SlashCommandBuilder, Interaction, gameAutocomplete, lobbyAutocomplete, gameOption, lobbyOption, userOption, User, Lobby, handleGameOption, handleLobbyOption } = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("force-join")
        .setDescription("Force join a user into a lobby")
        .addUserOption(userOption("target", "The user to join"), true)
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
        const user = interaction.options.getUser("target");

        const lobbyService = new LobbyService(lobby);
        await lobbyService.join(user.id);

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
