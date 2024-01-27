const { Events, ThreadChannel, ChannelType } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");
const { User, Lobby } = require("../models");

const permission_roles = require(`../../config.local.json`).roles
	.permission_roles;
const roleHierarchy = require("../utilities/role-hierarchy.js");

const messageCache = new Map();

module.exports = {
	name: Events.MessageCreate,
	execute: async (message) => {
		if (message.author.bot) return;

		const user_id = message.author.id;
		const currentTimestamp = new Date(message.createdTimestamp);

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

function hasRequiredRoleOrHigher(member, requiredRoleName) {
	const requiredRoleID = permission_roles[requiredRoleName];
	if (!requiredRoleID) {
		console.error("Invalid requiredRoleName:", requiredRoleName);
		return false;
	}

	const requiredRoleIndex = roleHierarchy.indexOf(requiredRoleID);
	if (requiredRoleIndex === -1) {
		console.error("Required role not found in roleHierarchy array");
		return false;
	}

	return member.roles.cache.some((role) => {
		const memberRoleIndex = roleHierarchy.indexOf(role.id);
		return memberRoleIndex !== -1 && memberRoleIndex <= requiredRoleIndex;
	});
}

async function updateLastMessageDate(user_id, currentTimestamp) {
	try {
		const user = await User.findByPk(user_id);
		user.last_message_date = currentTimestamp;
		await user.save();
	} catch (err) {
		console.log(err);
	}
}
