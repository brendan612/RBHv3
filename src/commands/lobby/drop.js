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
} = require("./index.js");

const LobbyService = require("../../dataManager/services/lobbyService.js");
const { hasRequiredRoleOrHigher } = require("../../utilities/utility-functions.js");

module.exports = {
    data: new SlashCommandBuilder().setName("drop").setDescription("Drop from a lobby").addStringOption(gameOption()).addIntegerOption(lobbyOption()).addUserOption(userOption()),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        const game = await handleGameOption(interaction);
        const lobby = await handleLobbyOption(interaction, game.game_id);
        const user = await handleUserOption(interaction, "target");

        if (user.user_id !== interaction.user.id && !hasRequiredRoleOrHigher(interaction.member, "trainee") && interaction.user.id !== lobby.host_id) {
            return interaction.reply({
                content: "You cannot drop someone else from a lobby",
                ephemeral: true,
            });
        }

        const lobbyService = new LobbyService(lobby);
        const { isDroppable, reason } = await lobbyService.drop(user.user_id);

        if (!isDroppable) {
            await interaction.reply({
                content: reason,
                ephemeral: true,
            });
            return;
        }
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
