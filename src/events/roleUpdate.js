const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildRoleUpdate,
	execute: async (role) => {
		console.log(role);
	},
};
