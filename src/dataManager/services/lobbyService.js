const { Interaction } = require("discord.js");

const {
	Lobby,
	User,
	Season,
	Game,
	Draft,
	MatchPlayer,
	Match,
	PlayerDraftRound,
	DraftRound,
	Sequelize,
} = require("../../models/index");
const LobbyDTO = require("../DTOs/lobbyDTO");
const { generateLobbyEmbed } = require("../messages/lobbyEmbed");
const DraftService = require("./draftService");
const channels = require(`../../../${process.env.CONFIG_FILE}`).channels;
const client = require("../../client.js");
const ThreadManager = require("../managers/threadManager.js");
const UserService = require("./userService.js");
const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

const { Mutex } = require("async-mutex");
const lobbyMutex = new Mutex();

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
			include: [
				{
					model: User,
				},
				Game,
			],
			order: [[Sequelize.literal("`Users->LobbyUsers`.`created_at`", "ASC")]],
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

		lobby.lobby_name = `Lobby #${lobby.lobby_id}`;
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

		const channel = await client.guild.channels.fetch(
			channels.games["League of Legends"]
		);
		await ThreadManager.deleteThread(channel, lobby.thread_id);
		lobby.thread_id = null;

		await lobby.save();

		const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);
		for (const user of lobbyDTO.players) {
			const userService = new UserService(user);
			await userService.removeRole(permission_roles.lobby_participant);
		}
	}

	/**
	 * @param {boolean} force
	 */
	async destroyLobby(force = false) {
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
			if (force) {
				await draft.destroy();

				if (this.lobby.match_id) {
					const match = await Match.findByPk(this.lobby.match_id);
					await match.destroy();
				}
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
				const userService = new UserService(user);
				await userService.removeRole(permission_roles.lobby_participant);
			} catch {}
		}

		await this.lobby.destroy();
		return true;
	}

	async redraft() {
		await DraftRound.destroy({
			where: {
				draft_id: this.lobby.draft_id,
			},
		});

		await PlayerDraftRound.destroy({
			where: {
				draft_id: this.lobby.draft_id,
			},
		});
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @returns {Promise<boolean>}
	 */
	async setHost(user_id) {
		const lobby = await Lobby.findOne({
			where: {
				lobby_id: this.lobby.lobby_id,
			},
		});

		if (lobby.host_id === user_id) {
			return false;
		}

		lobby.host_id = user_id;
		await lobby.save();

		return true;
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

		if (this.lobby.draft_id) {
			return { isJoinable: false, reason: "Draft has already started" };
		}

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

		if (this.lobby.draft_id) {
			return { isJoinable: false, reason: "Draft has already started" };
		}

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
				const canUse =
					interaction.user.id == this.lobby.host_id ||
					hasRequiredRoleOrHigher(interaction.member, "moderator");

				if (!canUse) {
					return await interaction.reply({
						content: "Only the host or staff can start the draft.",
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
		let joinable = null;
		const release = await lobbyMutex.acquire();
		try {
			joinable = await this.isJoinable(user_id);
			if (joinable.isJoinable) {
				await this.addUser(user_id.toString());
				const lobbyDTO = await LobbyService.getLobby(this.lobby.lobby_id);
				const message = await generateLobbyEmbed(lobbyDTO, true);
				await this.setMessage(message.id);
			}
		} catch (err) {
			joinable = { isJoinable: false, reason: err.message };
		} finally {
			release();
			return joinable;
		}
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
		const { draftable, reason } = await this.lobby.isDraftable();
		if (!draftable) {
			return { draftable, reason };
		}

		const draft = await DraftService.createDraft(this.lobby.lobby_id);
		const channel = await client.guild.channels.fetch(
			channels.games["League of Legends"]
		);

		const thread = await ThreadManager.createChannelThread(
			channel,
			draft.draft_id
		);

		this.lobby.thread_id = thread.id;
		await this.lobby.save();

		const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
		await draftService.startPlayerDraft();

		const lobbyDTO = await LobbyService.getLobby(this.lobby.lobby_id);
		for (const user of lobbyDTO.players) {
			const userService = new UserService(user);
			await userService.addRole(permission_roles.lobby_participant);
		}

		return { draftable, reason };
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
