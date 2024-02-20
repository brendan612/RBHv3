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

		const users = await lobby.getUsers();
		const guild = client.guilds.cache.get(client.guildID);
		for (const user of users) {
			try {
				const guildMember = guild.members.cache.get(user.user_id);
				await thread.members.add(guildMember);
			} catch {}
		}

		draft.thread_id = thread.id;
		await draft.save();
		return thread;
	}

	static async createMessageThread(message, draft_id) {}

	static async deleteThread(channel, thread_id) {
		const thread = await channel.threads.fetch(thread_id);
		if (thread) {
			await thread.delete();
		}
	}
}

module.exports = ThreadManager;
