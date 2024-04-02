const {
	ChannelType,
	Channel,
	VoiceChannel,
	GuildMember,
	PermissionsBitField,
} = require("discord.js");

const { User, ServerChannel } = require("../../models");

const LobbyDTO = require("../DTOs/lobbyDTO");

const client = require("../../client");

class ChannelManager {
	/**
	 *
	 * @param {ChannelType} channelType
	 * @param {string} name
	 * @param {Channel} parent
	 * @returns {Promise<Channel>}
	 */
	static async createChannel(channelType, name, parent) {
		if (!parent) {
			throw new Error("Parent channel is required");
		}
		const channel = await client.guild.channels.create(name, {
			type: channelType,
			parent: parent,
		});
		return channel;
	}

	/**
	 *
	 * @param {ChannelType} channelType
	 * @param {LobbyDTO} lobby
	 * @param {string} team
	 * @returns {Promise<void>}
	 */
	static async createChannelForLobby(channelType, lobby, team) {
		const emoji = team === "Blue" ? `🔵` : `🔴`;
		const lobbyParticipantRole = client.guild.roles.cache.find(
			(role) => role.name === "Lobby Participant"
		);
		const queensCroquetRole = client.guild.roles.cache.find(
			(role) => role.name === "Queen's Croquet"
		);
		const NARole = client.guild.roles.cache.find((role) => role.name === "NA");
		const EUWRole = client.guild.roles.cache.find(
			(role) => role.name === "EUW"
		);
		const guestRole = client.guild.roles.cache.find(
			(role) => role.name === "Guest"
		);
		const memberRole = client.guild.roles.cache.find(
			(role) => role.name === "Member"
		);
		const refRole = client.guild.roles.cache.find(
			(role) => role.name === "⚔️Queen's Croquet Referee⚔️"
		);
		const babyRefRole = client.guild.roles.cache.find(
			(role) => role.name === "🍼Referee Trainee🍼"
		);
		const deckmasterrole = client.guild.roles.cache.find(
			(role) => role.name === "📛Deckmaster📛"
		);
		const channel = await client.guild.channels.create({
			name: `${emoji} ${lobby.lobby_name} ${team}`,
			type: channelType,
			parent: "587057368731484170",
			permissionOverwrites: [
				{
					id: client.guild.id,
					deny: [PermissionsBitField.Flags.Speak],
				},
				{
					id: NARole.id,
					allow: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: EUWRole.id,
					allow: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: queensCroquetRole.id,
					allow: [PermissionsBitField.Flags.ViewChannel],
				},
				{
					id: lobbyParticipantRole.id,
					allow: [PermissionsBitField.Flags.Speak],
				},
				{
					id: refRole.id,
					allow: [PermissionsBitField.Flags.Speak],
				},
				{
					id: babyRefRole.id,
					allow: [PermissionsBitField.Flags.Speak],
				},
				{
					id: deckmasterrole.id,
					allow: [PermissionsBitField.Flags.Speak],
				},
			],
		});

		if (team === "Blue") {
			ChannelManager.setPosition(channel, 3);
		} else {
			ChannelManager.setPosition(channel, 4);
		}

		//prettier-ignore
		ChannelManager.createServerChannel(channel, lobby.game_id, lobby.lobby_name + "_" + team, lobby.region_id);

		return channel;
	}

	/**
	 *
	 * @param {number} game_id
	 * @param {string} region_id
	 * @param {string} purpose
	 * @returns {ServerChannel}
	 */
	static getServerChannel(game_id, region_id, purpose) {
		return client.serverChannels.find(
			(channel) =>
				channel.game_id == game_id &&
				channel.region_id == region_id &&
				channel.purpose == purpose
		);
	}
	/**
	 *
	 * @param {ServerChannel} serverChannel
	 * @returns {Channel}
	 */
	static getChannelForServerChannel(serverChannel) {
		return client.guild.channels.cache.get(serverChannel.channel_id);
	}

	/**
	 *
	 * @param {string} channel_id
	 * @returns {Channel}
	 */
	static getChannel(channel_id) {
		return client.guild.channels.cache.get(channel_id);
	}

	static getChannelViaServerChannel(game_id, region_id, purpose) {
		const serverChannel = ChannelManager.getServerChannel(
			game_id,
			region_id,
			purpose
		);
		return ChannelManager.getChannelForServerChannel(serverChannel);
	}

	/**
	 *
	 * @param {Channel} channel
	 * @param {number} game_id
	 * @param {string} purpose
	 * @param {string} region_id
	 * @returns {Promise<ServerChannel>}
	 */
	static async createServerChannel(channel, game_id, purpose, region_id) {
		const serverChannel = await ServerChannel.create({
			name: channel.name,
			type: channel.type,
			purpose: purpose,
			channel_id: channel.id,
			parent_id: channel.parentId,
			game_id: game_id,
			region_id: region_id,
		});

		client.serverChannels = await ServerChannel.findAll();

		return serverChannel;
	}

	/**
	 *
	 * @param {string} channel_id
	 * @returns {Promise<void>}
	 */
	static async deleteServerChannel(channel_id) {
		await ServerChannel.destroy({ where: { channel_id: channel_id } });
		client.serverChannels = await ServerChannel.findAll();
	}

	/**
	 *
	 * @param {Channel} channel
	 * @param {string} parent
	 * @param {number} position
	 * @returns {Promise<void>}
	 */
	static async moveChannel(channel, parent, position) {
		await channel.setParent(parent);
		await channel.setPosition(position);
	}

	/**
	 *
	 * @param {VoiceChannel} channel
	 * @param {string[]} users - Array of user ids
	 */
	static async moveUsersToChannel(channel, users) {
		for (const user of users) {
			const member = client.guild.members.cache.get(user);
			if (member && member.voice.channel) {
				await member.voice.setChannel(channel);
			}
		}
	}

	/**
	 *
	 * @param {Channel} channel
	 * @returns {Promise<void>}
	 */
	static async deleteChannel(channel) {
		await ChannelManager.deleteServerChannel(channel.id);
		await channel.delete();
	}

	/**
	 * @param {Channel} channel
	 * @param {string} name
	 * @returns {Promise<void>}
	 */
	static async setName(channel, name) {
		await channel.setName(name);
	}

	/**
	 *
	 * @param {Channel} channel
	 * @param {string} topic
	 * @returns {Promise<void>}
	 */
	static async setTopic(channel, topic) {
		await channel.setTopic(topic);
	}

	/**
	 * @param {Channel} channel
	 * @param {number} position
	 * @returns {Promise<void>}
	 */
	static async setPosition(channel, position) {
		await channel.setPosition(position);
	}
}

module.exports = ChannelManager;
