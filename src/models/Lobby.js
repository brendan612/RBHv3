const { DataTypes, Model, Sequelize } = require("sequelize");
const {
	lobbyEmbed,
	generatePlayerListForEmbed,
} = require("../components/lobbyEmbed.js");
const {
	GuildMember,
	Client,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	InteractionResponse,
} = require("discord.js");
const { User } = require("../models");
module.exports = (sequelize) => {
	class Lobby extends Model {
		/**
		 *
		 * @param {bigint} host_id
		 * @param {number} game_id
		 * @returns
		 */
		static async createLobby(host_id, game_id) {
			const Season = require("./Season.js")(sequelize);
			const season_id = (await Season.getCurrentSeason()).season_id;
			console.log(season_id);
			const season_lobby_id = (await Lobby.count()) + 1;
			return await Lobby.create({
				host_id: host_id,
				game_id: game_id,
				season_id: season_id,
				season_lobby_id: season_lobby_id,
			});
		}

		static async getLobby(lobby_id) {
			const User = require("./User.js")(sequelize);
			return await Lobby.findOne({
				where: { lobby_id: lobby_id },
				include: User,
			});
		}

		static async getOpenLobbies(game_name = "League of Legends") {
			const User = require("./User.js")(sequelize);
			const Game = require("./Game.js")(sequelize);
			const game = await Game.findOne({ where: { name: game_name } });
			return await Lobby.findAll({
				where: { closed_date: null, game_id: game.game_id },
				include: User,
			});
		}

		/**
		 *
		 * @param {Client} client
		 * @param {GuildMember} host
		 * @param {boolean} send
		 */
		generateEmbed = async (client, host, send) => {
			const { channels } = require("../../config.json");

			let playerList = [];
			let reserves = [];
			const users = await this.getUsers({
				order: [[Sequelize.literal("LobbyUsers.created_at"), "ASC"]],
				through: {
					attributes: ["created_at"], // This will include the "created_at" field from the join table in the result
				},
			});
			users.forEach((user) => {
				if (playerList.length < 10) {
					playerList.push(user.summoner_name);
				} else {
					reserves.push(user.summoner_name);
				}
			});
			const embed = lobbyEmbed(
				"In-House sign-ups now open!",
				`Tentative Lobby ID: ${this.season_lobby_id}`,
				host,
				`${this.lobby_id}`
			).addFields({
				name: `Joined Players (${playerList.length}/10)`,
				value: generatePlayerListForEmbed(playerList),
				inline: false,
			});

			if (reserves.length > 0) {
				embed.addFields({
					name: `Reserves (${reserves.length}/3)`,
					value: generatePlayerListForEmbed(reserves),
					inline: false,
				});
			}

			const joinButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Success)
				.setLabel("Join")
				.setCustomId(`join_${this.lobby_id}`);
			const dropButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Danger)
				.setLabel("Drop")
				.setCustomId(`drop_${this.lobby_id}`);

			const components = new ActionRowBuilder();
			if ((await this.isJoinable()).joinable) {
				components.addComponents(joinButton);
			}
			if ((await this.isDroppable()).droppable) {
				components.addComponents(dropButton);
			}

			if (send) {
				const channel_id = channels["games"]["League of Legends"];
				const channel = await client.channels.fetch(channel_id);
				const message = await channel.send({
					embeds: [embed],
					components: [components],
				});

				const previousMessage = await channel.messages.fetch(this.message_id);
				if (previousMessage) {
					await previousMessage.delete();
				}

				this.message_id = message.id;
				await this.save();
			}

			return { embed, components };
		};

		/**
		 *
		 * @param {Interaction} interaction
		 * @param {string} action
		 */
		handleButton = async (interaction, action) => {
			const User = require("./User.js")(sequelize);
			const user = await User.findOne({
				where: { user_id: interaction.member.id },
			});
			let message = null;
			if (action === "join") {
				const { joinable, reason } = await this.isJoinable(user.user_id);
				if (!joinable) {
					message = await interaction.followUp({
						content: reason,
						ephemeral: true,
					});
					return;
				}

				await this.addUser(user.user_id);
			} else if (action === "drop") {
				const { droppable, reason } = await this.isDroppable(user.user_id);
				if (!droppable) {
					message = await interaction.followUp({
						content: reason,
						ephemeral: true,
					});
					return;
				}

				await this.removeUser(user.user_id);
			}
			await this.generateEmbed(interaction.client, interaction.member, true);
		};

		/**
		 *
		 * @param {bigint} user_id
		 * @returns { {joinable: boolean, reason: string} }
		 */
		isJoinable = async (user_id) => {
			const lobbyUsers = await this.getUsers();
			//check if lobby is full
			//10 players + 3 reserves
			if (lobbyUsers.length >= 13) {
				return { joinable: false, reason: "Lobby is full" };
			}
			//check if user is already in lobby
			if (
				user_id &&
				lobbyUsers.some((lobbyUser) => lobbyUser.user_id === user_id)
			) {
				return { joinable: false, reason: "You are already in this lobby." };
			}

			return { joinable: true, reason: "" };
		};

		/**
		 *
		 * @param {bigint} user_id
		 * @returns { {droppable: boolean, reason: string}
		 */
		isDroppable = async (user_id) => {
			if (user_id) {
				const lobbyUsers = await this.getUsers();
				//check if user is not in lobby
				if (!lobbyUsers.some((user) => user.user_id === user_id)) {
					return { droppable: false, reason: "You are not in this lobby." };
				}
			} else {
				const lobbyUsersCount = (await this.getUsers()).length;
				if (lobbyUsersCount > 0) {
					return { droppable: true, reason: "This Lobby is not empty." };
				}
				return {
					droppable: false,
					reason: "This Lobby is empty.",
				};
			}

			return { droppable: true, reason: "" };
		};
	}
	Lobby.init(
		{
			lobby_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			season_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			season_lobby_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				unique: true,
			},
			lobby_name: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			closed_date: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			host_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			message_id: {
				type: DataTypes.BIGINT,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Lobby",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Lobby;
};
