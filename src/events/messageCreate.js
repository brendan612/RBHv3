const { Events, ThreadChannel, ChannelType } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
const { User, Lobby, AutoResponse, Sequelize } = require("../models");
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

		if (!lastTimestamp || currentTimestamp - lastTimestamp > 360) {
			messageCache.set(user_id, currentTimestamp);
			const userService = await UserService.createUserService(user_id);
			await userService.addExperience(35);
			//await updateLastMessageDate(user_id, currentTimestamp);
		}

		const autoResponse = await AutoResponse.findOne({
			where: Sequelize.where(
				Sequelize.fn("LOWER", Sequelize.col("trigger")),
				Sequelize.fn("LOWER", message.content)
			),
		});

		if (autoResponse) {
			message.channel.send(autoResponse.response);
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
