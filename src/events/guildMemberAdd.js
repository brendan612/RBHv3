const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildMemberAdd,
	execute: async (member) => {
		console.log(member);
		await User.createUser(member.user.id, member.joinedAt);
	},
};
