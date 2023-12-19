const { Events } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
const { User } = require("../models");

const messageCache = new Map();

module.exports = {
	name: Events.MessageCreate,
	execute: async (message) => {
		if (message.author.bot) return;

		const user_id = message.author.id;
		const currentTimestamp = new Date(message.createdTimestamp);

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

		if (message.content.toLowerCase().includes("wo")) {
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
