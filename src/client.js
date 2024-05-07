const { Client, GatewayIntentBits } = require("discord.js");
const { REST } = require("@discordjs/rest");

require("dotenv").config();

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
rest.setOptions({ timeout: 30000 });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildEmojisAndStickers,
    ],
});
client.guildID = process.env.GUILDID;

module.exports = client;
