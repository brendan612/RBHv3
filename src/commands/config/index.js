const {
    SlashCommandBuilder,
    // @ts-ignore
    Interaction,
    CommandInteraction,
} = require("discord.js");
const { gameAutocomplete, seasonAutocomplete, lobbyAutocomplete, championAutocomplete, regionAutocomplete } = require("../../handlers/autocompleteHandler.js");
const { gameOption, lobbyOption, userOption, seasonOption, championOption, regionOption } = require("../../components/commandOptions.js");
const { handleGameOption, handleLobbyOption, handleUserOption, handleSeasonOption, handleChampionOption, handleRegionOption } = require("../../handlers/executeOptionsHandler.js");
const { sequelize, User, ModerationLog, Game, Season, Lobby, Draft, DraftRound, Champion, Sequelize, PlayerDraftRound } = require("../../models");

module.exports = {
    SlashCommandBuilder,
    CommandInteraction,
    // @ts-ignore
    Interaction,
    sequelize,
    User,
    ModerationLog,
    Game,
    Season,
    Lobby,
    Draft,
    DraftRound,
    PlayerDraftRound,
    Champion,
    Sequelize,
    gameAutocomplete,
    seasonAutocomplete,
    lobbyAutocomplete,
    championAutocomplete,
    regionAutocomplete,
    gameOption,
    lobbyOption,
    userOption,
    seasonOption,
    championOption,
    regionOption,
    handleGameOption,
    handleLobbyOption,
    handleUserOption,
    handleSeasonOption,
    handleChampionOption,
    handleRegionOption,
};
