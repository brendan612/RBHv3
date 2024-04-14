const { SlashCommandBuilder, Interaction } = require("discord.js");
const { gameAutocomplete, seasonAutocomplete, lobbyAutocomplete, championAutocomplete, regionAutocomplete } = require("../../handlers/autocompleteHandler.js");
const { gameOption, lobbyOption, userOption, seasonOption, championOption, regionOption } = require("../../components/commandOptions.js");
const { handleGameOption, handleLobbyOption, handleUserOption, handleSeasonOption, handleChampionOption, handleRegionOption } = require("../../handlers/executeOptionsHandler.js");
const { sequelize, User, ModerationLog, Game, Season, Lobby, Draft, DraftRound, Champion, Sequelize, PlayerDraftRound, Region } = require("../../models");

module.exports = {
    SlashCommandBuilder,
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
    Region,
    gameAutocomplete,
    seasonAutocomplete,
    lobbyAutocomplete,
    championAutocomplete,
    gameOption,
    lobbyOption,
    userOption,
    seasonOption,
    championOption,
    handleGameOption,
    handleLobbyOption,
    handleUserOption,
    handleSeasonOption,
    handleChampionOption,
    handleRegionOption,
    regionOption,
    regionAutocomplete,
};
