const { SlashCommandBuilder, Interaction } = require("discord.js");
const {
	lobbyEmbed,
	generatePlayerListForEmbed,
} = require("../../components/lobbyEmbed.js");
const {
	gameAutocomplete,
	lobbyAutocomplete,
} = require("../../handlers/autocompleteHandler.js");
const {
	gameOption,
	lobbyOption,
	userOption,
} = require("../../components/commandOptions.js");
const { sequelize, User, Lobby, Game } = require("../../models");
const {
	handleGameOption,
	handleLobbyOption,
	handleUserOption,
} = require("../../handlers/executeOptionsHandler.js");

module.exports = {
	SlashCommandBuilder,
	Interaction,
	lobbyEmbed,
	generatePlayerListForEmbed,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	userOption,
	sequelize,
	User,
	Lobby,
	Game,
	handleGameOption,
	handleLobbyOption,
	handleUserOption,
};
