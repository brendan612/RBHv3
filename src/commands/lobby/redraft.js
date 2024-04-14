const { SlashCommandBuilder, Interaction, gameAutocomplete, lobbyAutocomplete, gameOption, lobbyOption, handleGameOption, handleLobbyOption, Draft } = require("./index.js");

const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");

const DraftService = require("../../dataManager/services/draftService.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const client = require("../../client.js");

module.exports = {
    data: new SlashCommandBuilder().setName("redraft").setDescription("Redraft a lobby").addStringOption(gameOption()).addIntegerOption(lobbyOption()),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        // interaction.user is the object representing the User who ran the command
        // interaction.member is the GuildMember object, which represents the user in the specific guild
        const game = await handleGameOption(interaction);
        const lobby = await handleLobbyOption(interaction, game.game_id);

        const lobbyService = new LobbyService(lobby);
        await lobbyService.redraft();
        await interaction.reply({
            content: `Lobby # ${lobby.lobby_id} will be redrafted.`,
        });

        const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

        const draft = await Draft.findByPk(lobby.draft_id);
        const draftDTO = new DraftDTO(draft);
        const draftService = new DraftService(draft);
        const playerDraftService = new PlayerDraftService(draft);

        const playerDraftManager = client.managers.playerDraftManagerFactory.getPlayerDraftManager(draft.draft_id);

        playerDraftManager.reset();

        playerDraftManager.captains = await draftService.pickCaptains(lobbyDTO);
        playerDraftManager.picking_captain = playerDraftManager.captains[1];
        draft.red_captain_id = playerDraftManager.captains[0].user_id;
        draft.blue_captain_id = playerDraftManager.captains[1].user_id;
        await draft.save();

        const draftManager = client.managers.draftManagerFactory.getDraftManager(draft.draft_id);

        draftManager.reset();

        await playerDraftService.generatePlayerDraftEmbed(draftDTO, true);
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
