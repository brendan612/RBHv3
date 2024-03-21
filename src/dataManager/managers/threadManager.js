const { Draft, Lobby } = require("../../models");
const {
	ThreadChannel,
	GuildTextBasedChannel,
	TextChannel,
	PermissionsBitField,
	ThreadAutoArchiveDuration,
} = require("discord.js");

const client = require("../../client.js");

class ThreadManager {
	/**
	 *
	 * @param {TextChannel} channel
	 * @param {number} draft_id
	 * @returns {Promise<ThreadChannel>}
	 */
	static async createChannelThread(channel, draft_id) {
		const draft = await Draft.findByPk(draft_id);
		const lobby = await Lobby.findByPk(draft.lobby_id);

		const thread = await channel.threads.create({
			name: lobby.lobby_name,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
			reason: "Draft Thread",
		});

		const LobbyService = require("../services/lobbyService.js");
		const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

		const addUserPromises = lobbyDTO.players.map(async (user) => {
			return await ThreadManager.addUserToThread(thread, user.user_id);
		});

		await Promise.all(addUserPromises);

		draft.thread_id = thread.id;
		await draft.save();
		return thread;
	}

	static async createMessageThread(message, draft_id) {}

	static async deleteThread(channel, thread_id) {
		try {
			const thread = await channel.threads.fetch(thread_id);
			if (thread) {
				await thread.delete();
			}
		} catch (error) {
			console.log("Thread does not exist");
		}
	}

	/**
	 *
	 * @param {ThreadChannel} thread
	 * @param {string} user_id
	 * @returns {Promise<void>}
	 */
	static async addUserToThread(thread, user_id) {
		if (user_id.length < 5) return;

		try {
			let guildMember = client.guild.members.cache.get(user_id);

			if (!guildMember) {
				await client.guild.members.fetch(user_id).then((member) => {
					guildMember = member;
				});
			}

			await thread.members.add(guildMember);
		} catch (error) {
			console.error(error);
		}
	}
}

module.exports = ThreadManager;
