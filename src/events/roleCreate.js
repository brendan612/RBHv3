const { Events } = require("discord.js");

module.exports = {
    name: Events.GuildRoleCreate,
    execute: async (role) => {
        console.log(role);
    },
};
