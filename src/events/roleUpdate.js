const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildRoleUpdate,
	execute: async (oldRole, newRole) => {
		console.log(oldRole.name, newRole.name);
	},
};
