const { SlashCommandBuilder, Interaction } = require("discord.js");
const { sequelize, User, Referral, ReferralCode } = require("../../models");
const { userOption } = require("../../components/commandOptions");

module.exports = {
	SlashCommandBuilder,
	Interaction,
	sequelize,
	User,
	Referral,
	ReferralCode,
	userOption,
};
