const {
	GuildMember,
	Client,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	Interaction,
	ButtonInteraction,
} = require("discord.js");

const {
	Lobby,
	User,
	Season,
	Game,
	Draft,
	PlayerDraftRound,
} = require("../../models/index");
const LobbyDTO = require("../DTOs/lobbyDTO");
const { generateLobbyEmbed } = require("../messages/lobbyEmbed");
const DraftService = require("./draftService");
const channels = require("../../../config.json").channels;
const client = require("../../client.js");
const ThreadManager = require("../managers/threadManager.js");

class LobbyService {
	/**
	 *
	 * @param {Lobby} lobby
	 */
	constructor(lobby) {
		this.lobby = lobby;
	}

	/**
	 *
	 * @param {number} lobby_id
	 * @returns {Promise<LobbyDTO>}
	 */
	static async getLobby(lobby_id) {
		const lobby = await Lobby.findOne({
			where: {
				lobby_id: lobby_id,
			},
			include: [User, Game],
		});
		return new LobbyDTO(lobby);
	}

	/**
	 *
	 * @param {bigint} host_id
	 * @param {number} game_id
	 * @returns {Promise<LobbyDTO>}
	 */
	static async createLobby(host_id, game_id) {
		const currentSeason = await Season.getCurrentSeason(game_id);
		const season_id = currentSeason.season_id;
		const seasonLobbyCount = await Lobby.count({
			where: { season_id: season_id, game_id: game_id },
		});
		const season_lobby_id = seasonLobbyCount + 1;

		const lobby = await Lobby.create({
			host_id: host_id,
			game_id: game_id,
			season_id: season_id,
			season_lobby_id: season_lobby_id,
		});

		lobby.lobby_name = `Lobby ${lobby.lobby_id}`;
		await lobby.save();

		return await this.getLobby(lobby.lobby_id);
	}

	/**
	 *
	 * @returns void
	 **/
	async closeLobby() {
		const lobby = await Lobby.findByPk(this.lobby.lobby_id);

		lobby.closed_date = new Date();
		await lobby.save();
	}

	async openLobby() {
		const lobby = await Lobby.findByPk(this.lobby.lobby_id);
		if (lobby.draft_id) {
			const draft = await Draft.findByPk(lobby.draft_id);
			await draft.destroy();
		}

		lobby.closed_date = null;
		lobby.draft_id = null;
		await lobby.save();
	}

	/**
	 *
	 */
	async destroyLobby() {
		const channel = await client.guild.channels.fetch(
			channels.games["League of Legends"]
		);
		if (this.lobby.draft_id) {
			const draft = await Draft.findByPk(this.lobby.draft_id);
			if (draft.thread_id) {
				try {
					await ThreadManager.deleteThread(channel, draft.thread_id);
					draft.thread_id = null;
					await draft.save();
				} catch {}
			} else if (draft.message_id) {
				try {
					const message = await channel.messages.fetch(draft.message_id);
					if (message) {
						await message.delete();
					}
				} catch (err) {}
			}
		} else {
			try {
				const message = await channel.messages.fetch(this.lobby.message_id);
				if (message) {
					await message.delete();
				}
			} catch (err) {}
		}

		const guild = await client.guilds.fetch(client.guildID);
		const users = await this.lobby.getUsers();
		for (const user of users) {
			try {
				const guildMember = await guild.members.fetch(user.user_id);
				await channel.permissionOverwrites.delete(guildMember);
			} catch {}
		}

		await this.lobby.destroy();
		await this.lobby.save();
		return true;
	}

	async redraft() {
		const draftRounds = await PlayerDraftRound.findAll({
			where: {
				draft_id: this.lobby.draft_id,
			},
		});

		for (const draftRound of draftRounds) {
			await draftRound.destroy();
		}
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @returns {Promise<string>}
	 */
	async setHost(user_id) {
		const lobby = await Lobby.findOne({
			where: {
				lobby_id: this.lobby.lobby_id,
			},
		});

		if (lobby.host_id === user_id) {
			return "User is already host.";
		}

		lobby.host_id = user_id;
		await lobby.save();

		return `Host changed to <@${user_id}>.`;
	}

	/**
	 *
	 * @param {bigint} message_id - Discord message ID
	 */
	async setMessage(message_id) {
		this.lobby.message_id = message_id;
		await this.lobby.save();
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @returns string
	 */
	async addUser(user_id) {
		const { isJoinable, reason } = await this.isJoinable(user_id);

		if (!isJoinable) {
			return reason;
		}

		await this.lobby.addUser(user_id);
		await this.lobby.save();
		return `<@${user_id}> joined the lobby.`;
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @returns string
	 */
	async dropUser(user_id) {
		const { isDroppable, reason } = await this.isDroppable(user_id);

		if (!isDroppable) {
			return reason;
		}

		await this.lobby.removeUser(user_id);
		await this.lobby.save();
		return `<@${user_id}> dropped from the lobby.`;
	}

	/**
	 *
	 * @param {string} user_id
	 * @returns {Promise<{isJoinable: boolean, reason: string}>}
	 */
	async isJoinable(user_id = "") {
		const lobbyUsers = await this.lobby.getUsers();
		if (user_id) {
			const userInLobby = lobbyUsers.find(
				(lobbyUser) => lobbyUser.user_id === user_id
			);

			if (userInLobby)
				return { isJoinable: false, reason: "User already in lobby" };
			return {
				isJoinable: lobbyUsers.length < 13,
				reason: "User not in lobby",
			};
		}

		if (lobbyUsers.length < 13) {
			return { isJoinable: true, reason: "Lobby is not full" };
		}

		return { isJoinable: false, reason: "Lobby is full" };
	}

	/**
	 *
	 * @param {string} user_id
	 * @returns {Promise<{isDroppable: boolean, reason: string}>}
	 */
	async isDroppable(user_id = "") {
		const lobbyUsers = await this.lobby.getUsers();

		if (user_id) {
			const userInLobby = lobbyUsers.find(
				(lobbyUser) => lobbyUser.user_id === user_id
			);
			if (!userInLobby)
				return { isDroppable: false, reason: "User not in lobby" };
			return { isDroppable: true, reason: "User in lobby" };
		}

		if (lobbyUsers.length <= 0) {
			return { isDroppable: false, reason: "Lobby is empty" };
		}

		return { isDroppable: true, reason: "Lobby is not empty" };
	}

	/**
	 *
	 * @returns {Promise<{isDraftable: boolean, reason: string}>}
	 */
	async isDraftable() {
		const lobbyUsers = await this.lobby.getUsers();
		if (lobbyUsers.length < 10) {
			return {
				isDraftable: false,
				reason: "Lobby has less than 10 players",
			};
		}

		return {
			isDraftable: true,
			reason: "Lobby has 10 players",
		};
	}

	/**
	 *
	 * @param {Interaction} interaction
	 * @param {string} action
	 */
	async handleButton(interaction, action) {
		switch (action) {
			case "join":
				const joinable = await this.join(interaction.user.id);
				if (joinable.isJoinable) {
					await interaction.deferReply({ ephemeral: true });
					await interaction.deleteReply();
				} else {
					return await interaction.reply({
						content: joinable.reason,
						ephemeral: true,
					});
				}
				break;
			case "drop":
				const droppable = await this.drop(interaction.user.id);
				if (droppable.isDroppable) {
					await interaction.deferReply({ ephemeral: true });
					await interaction.deleteReply();
				} else {
					return await interaction.reply({
						content: droppable.reason,
						ephemeral: true,
					});
				}
				break;
			case "draft":
				if (interaction.user.id !== this.lobby.host_id) {
					return await interaction.reply({
						content: "Only the host can start the draft.",
						ephemeral: true,
					});
				}
				await this.draft(interaction.user.id);
				break;
			default:
				break;
		}
	}

	/**
	 *
	 * @param {string} user_id
	 * @returns {Promise<{isJoinable: boolean, reason: string}>}
	 */
	async join(user_id) {
		const user = await User.findOne({ where: { user_id: user_id } });
		const joinable = await this.isJoinable(user_id);
		if (joinable.isJoinable) {
			await this.addUser(user_id);
			const lobbyDTO = await LobbyService.getLobby(this.lobby.lobby_id);
			const message = await generateLobbyEmbed(lobbyDTO, true);
			await this.setMessage(message.id);
		}
		return joinable;
	}

	/**
	 *
	 * @param {string} user_id
	 * @returns {Promise<{isDroppable: boolean, reason: string}>}
	 */
	async drop(user_id) {
		const user = await User.findOne({ where: { user_id: user_id } });
		const droppable = await this.isDroppable(user_id);
		if (droppable.isDroppable) {
			await this.dropUser(user_id);
			const lobbyDTO = await LobbyService.getLobby(this.lobby.lobby_id);
			const message = await generateLobbyEmbed(lobbyDTO, true);
			await this.setMessage(message.id);
		}
		return droppable;
	}

	async draft() {
		const draft = await DraftService.createDraft(this.lobby.lobby_id);
		const channel = await client.guild.channels.fetch(
			channels.games["League of Legends"]
		);

		const thread = await ThreadManager.createChannelThread(
			channel,
			draft.draft_id
		);

		const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
		await draftService.startPlayerDraft();
	}

	/**
	 *
	 * @param {LobbyDTO} lobby
	 * @param {boolean} sendMessage
	 * @returns {Promise<{embed: EmbedBuilder, components: ActionRowBuilder} | Message>} embed and components or message
	 */
	async generateLobbyEmbed(lobby, sendMessage = true) {
		const { generateLobbyEmbed } = require("../messages/lobbyEmbed");
		const result = await generateLobbyEmbed(lobby, sendMessage);

		if (sendMessage) {
			await this.setMessage(result.id);
		}

		return result;
	}
}

module.exports = LobbyService;
