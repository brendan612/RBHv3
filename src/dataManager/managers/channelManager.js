const { ChannelType, Channel, VoiceChannel, GuildMember, PermissionsBitField } = require("discord.js");

const { User, ServerChannel } = require("../../models");

const LobbyDTO = require("../DTOs/lobbyDTO");

const client = require("../../client");

const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles.permission_roles;

const RoleManager = require("./roleManager");

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

        const lobbyParticipantRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "lobby_participant");
        const queensCroquetRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "verified");
        const regionRole = RoleManager.getRoleViaServerRole(lobby.game_id, lobby.region_id, "region");
        const guestRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "guest");
        const memberRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "member");
        const refRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "moderator");
        const babyRefRole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "trainee");
        const deckmasterrole = RoleManager.getRoleViaServerRole(lobby.game_id, "GLOBAL", "admin");

        const category = this.getServerChannel(lobby.game_id, "GLOBAL", "general", ChannelType.GuildCategory);

        const speakStream = [PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream];

        const channel = await client.guild.channels.create({
            name: `${emoji} ${lobby.lobby_name} ${team}`,
            type: channelType,
            parent: category.channel_id,
            permissionOverwrites: [
                {
                    id: client.guild.id,
                    deny: speakStream,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: lobbyParticipantRole.id,
                    allow: speakStream,
                },
                {
                    id: refRole.id,
                    allow: speakStream,
                },
                {
                    id: babyRefRole.id,
                    allow: speakStream,
                },
                {
                    id: deckmasterrole.id,
                    allow: speakStream,
                },
            ],
        });

        const vc_count = client.guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildVoice && channel.parent === category.channel_id).size;

        if (team === "Blue") {
            ChannelManager.setPosition(channel, vc_count - 1);
        } else {
            ChannelManager.setPosition(channel, vc_count - 2);
        }

        //prettier-ignore
        ChannelManager.createServerChannel(channel, lobby.game_id, lobby.lobby_name + "_" + team, lobby.region_id);

        return channel;
    }

    static async getChannelsForLobby(region_id, lobby_id) {
        const channel_ids = client.guild.channels.cache
            .filter((channel) => channel.type === ChannelType.GuildVoice && channel.name.includes(lobby_id) && channel.name.includes(region_id))
            .map((channel) => channel.id);
        return channel_ids;
    }

    /**
     *
     * @param {number} game_id
     * @param {string} region_id
     * @param {string} purpose
     * @returns {ServerChannel}
     */
    static getServerChannel(game_id, region_id, purpose) {
        return client.serverChannels.find((channel) => channel.game_id == game_id && channel.region_id == region_id && channel.purpose == purpose);
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
        const serverChannel = ChannelManager.getServerChannel(game_id, region_id, purpose);
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
            if (member && member.voice.channel && member.voice.channel.name.includes("Lobby")) {
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
