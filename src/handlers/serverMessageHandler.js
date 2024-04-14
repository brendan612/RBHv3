const { Embed, ActionRowBuilder, GuildChannel, Client } = require("discord.js");
const { ServerMessage } = require("../models");
const { leagueRoleSelectMessage } = require("../components/serverMessages/leagueRoleSelect");

const checkAndUpdateServerMessages = async () => {
    await leagueRoleSelectMessage();
};

module.exports = { checkAndUpdateServerMessages };
