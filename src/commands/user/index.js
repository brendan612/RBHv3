const { SlashCommandBuilder, Interaction } = require("discord.js");
const { sequelize, User, Referral, ReferralCode } = require("../../models");
const {
	gameAutocomplete,
	seasonAutocomplete,
	lobbyAutocomplete,
	championAutocomplete,
	regionAutocomplete,
} = require("../../handlers/autocompleteHandler.js");
const {
	gameOption,
	lobbyOption,
	userOption,
	seasonOption,
	championOption,
	regionOption,
} = require("../../components/commandOptions.js");
const {
	handleGameOption,
	handleLobbyOption,
	handleUserOption,
	handleSeasonOption,
	handleChampionOption,
	handleRegionOption,
} = require("../../handlers/executeOptionsHandler.js");
module.exports = {
	SlashCommandBuilder,
	Interaction,
	sequelize,
	User,
	Referral,
	ReferralCode,
	userOption,
	regionAutocomplete,
	handleRegionOption,
	regionOption,
};
