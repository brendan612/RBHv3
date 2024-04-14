const { SlashCommandBuilder, Interaction, gameAutocomplete, lobbyAutocomplete, gameOption, lobbyOption, handleGameOption, handleLobbyOption } = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");

module.exports = {
    data: new SlashCommandBuilder().setName("reopen").setDescription("Reopen a lobby").addStringOption(gameOption()).addIntegerOption(lobbyOption()),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        await interaction.deferReply();
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        const game = await handleGameOption(interaction);
        const lobby = await handleLobbyOption(interaction, game.game_id);

        await interaction.editReply({
            content: `${lobby.lobby_name} will be reopened.`,
        });

        const lobbyService = new LobbyService(lobby);
        await lobbyService.openLobby();

        await lobbyService.generateLobbyEmbed(await LobbyService.getLobby(lobby.lobby_id), true);
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
