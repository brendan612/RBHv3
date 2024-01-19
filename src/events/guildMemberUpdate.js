const { Events, Interaction } = require("discord.js");
const config = require("../../config.json").roles;

module.exports = {
	name: Events.GuildMemberUpdate,
	execute: async (oldMember, newMember) => {
		const boosterRoleID = "";
	},
};
