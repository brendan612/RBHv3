class VoiceChannelManager {
	static async createVoiceChannel(guild, name, options = {}) {
		const channel = await guild.channels.create(name, {
			type: "GUILD_VOICE",
			...options,
		});

		return channel;
	}
}
