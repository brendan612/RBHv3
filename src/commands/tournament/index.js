const { SlashCommandBuilder, Interaction, SlashCommandSubcommandBuilder } = require("discord.js");
const { lobbyEmbed, generatePlayerListForEmbed } = require("../../components/lobbyEmbed.js");
const { gameAutocomplete, seasonAutocomplete, lobbyAutocomplete, championAutocomplete } = require("../../handlers/autocompleteHandler.js");
const { gameOption, lobbyOption, userOption, seasonOption, championOption } = require("../../components/commandOptions.js");
const { sequelize, Sequelize, User, Lobby, Game, GameMode, Season, Match, MatchPlayer, Draft, DraftRound, PlayerDraftRound, Champion, Region, Tournament, Team } = require("../../models");
const { handleGameOption, handleLobbyOption, handleUserOption, handleSeasonOption, handleChampionOption } = require("../../handlers/executeOptionsHandler.js");
const { baseEmbed } = require("../../components/embed.js");
module.exports = {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    Interaction,
    Sequelize,
    lobbyEmbed,
    generatePlayerListForEmbed,
    gameAutocomplete,
    seasonAutocomplete,
    lobbyAutocomplete,
    championAutocomplete,
    gameOption,
    seasonOption,
    lobbyOption,
    userOption,
    championOption,
    sequelize,
    User,
    Lobby,
    Game,
    GameMode,
    Season,
    Match,
    MatchPlayer,
    Draft,
    DraftRound,
    PlayerDraftRound,
    Champion,
    Region,
    Tournament,
    Team,
    handleGameOption,
    handleLobbyOption,
    handleUserOption,
    handleSeasonOption,
    handleChampionOption,
    baseEmbed,
};
