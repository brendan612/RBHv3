const { Events } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
module.exports = {
	name: Events.GuildMemberAdd,
	execute: async (member) => {
		const user = await UserService.createUser(member.id, member.joinedAt);
		console.log(`New member joined: ${user.user_id}`);
	},
};
