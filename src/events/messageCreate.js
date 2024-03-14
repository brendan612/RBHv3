const { Events, ChannelType, Message } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
const { User, Lobby, AutoResponse, Sequelize } = require("../models");
const {
	hasRequiredRoleOrHigher,
} = require("../utilities/utility-functions.js");

const EXPERIENCE_TIMEOUT = 60 * 1000 * 6; //6 minutes

module.exports = {
	name: Events.MessageCreate,
	execute: async (message) => {
		if (message.author.bot) return;

		await handleValidThreadUser(message);
		await handleMessageExperience(message);
		await handleAutoResponse(message);

		return;
	},
};

/**
 *
 * @param {Message} message
 */
async function handleValidThreadUser(message) {
	const user_id = message.author.id;
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
}

/**
 *
 * @param {Message} message
 */
async function handleMessageExperience(message) {
	const user_id = message.author.id;
	const user = await User.findByPk(user_id);
	const currentTimestamp = Date.now();
	const lastMessageTimestamp = user.last_message_date || 0;

	const allowExperience =
		currentTimestamp - lastMessageTimestamp > EXPERIENCE_TIMEOUT;

	if (allowExperience) {
		const userService = await UserService.createUserService(user_id);
		await userService.addExperience(35);
		user.last_message_date = currentTimestamp;
		await user.save();
	}
}

/**
 *
 * @param {Message} message
 */
async function handleAutoResponse(message) {
	const autoResponse = await AutoResponse.findOne({
		where: Sequelize.where(
			Sequelize.fn("LOWER", Sequelize.col("trigger")),
			Sequelize.fn("LOWER", message.content)
		),
	});

	if (autoResponse) {
		message.channel.send(autoResponse.response);
	}
}
