const { Events, ThreadChannel, ChannelType } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
const { User, Lobby } = require("../models");
const {
	hasRequiredRoleOrHigher,
} = require("../utilities/utility-functions.js");
const messageCache = new Map();

module.exports = {
	name: Events.MessageCreate,
	execute: async (message) => {
		if (message.author.bot) return;

		const user_id = message.author.id;
		const currentTimestamp = new Date(message.createdTimestamp);

		//remove messages from lobby threads if they are not in the lobby
		if (message.channel.type === ChannelType.PublicThread) {
			const lobby = await Lobby.findOne({
				where: { thread_id: message.channel.id },
			});
			if (lobby) {
				const users = await lobby.getUsers();
				if (
					!users.some((user) => user.user_id === user_id) &&
					!hasRequiredRoleOrHigher(message.member, "trainee")
				) {
					message.delete();
				}
			}
		}

		const lastTimestamp = messageCache.get(user_id);

		if (!lastTimestamp || currentTimestamp - lastTimestamp > 300) {
			messageCache.set(user_id, currentTimestamp);
			const userService = await UserService.createUserService(user_id);
			await userService.addExperience(35);
			//await updateLastMessageDate(user_id, currentTimestamp);
		}

		if (message.content.toLowerCase().includes("good bot")) {
			message.reply("Thank you!");
		}

		const cleanedContent = message.content.toLowerCase().trim();
		if (
			cleanedContent == "wo" ||
			cleanedContent == "without" ||
			cleanedContent == "draft wo"
		) {
			message.reply("draft without someone???");
		}

		return;
	},
};

async function updateLastMessageDate(user_id, currentTimestamp) {
	try {
		const user = await User.findByPk(user_id);
		user.last_message_date = currentTimestamp;
		await user.save();
	} catch (err) {
		console.log(err);
	}
}
