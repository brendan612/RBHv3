const { Events, Interaction } = require("discord.js");
const config = require(`../../${process.env.CONFIG_FILE}`).roles;

module.exports = {
	name: Events.GuildMemberUpdate,
	execute: async (oldMember, newMember) => {
		const boosterRoleID = "";
	},
};
