const { Events, Interaction } = require("discord.js");
const config = require(`../../${process.env.CONFIG_FILE}`).roles;

const client = require("../index.js");

module.exports = {
	name: Events.GuildMemberUpdate,
	execute: async (oldMember, newMember) => {
		const oldRoles = oldMember.roles.cache;
		const newRoles = newMember.roles.cache;

		const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
		const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

		addedRoles.forEach((role) => {
			console.log(`Added role: ${role.name} to ${newMember.user.id}`);
		});

		removedRoles.forEach((role) => {
			console.log(`Removed role: ${role.name} to ${newMember.user.id}`);
		});
	},
};
