const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildRoleDelete,
	execute: async (role) => {
		console.log(role);
	},
};
