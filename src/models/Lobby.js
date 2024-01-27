const { DataTypes, Model, Sequelize, Op } = require("sequelize");
const {
	lobbyEmbed,
	generatePlayerListForEmbed,
	generatePlayerRolesListForEmbed,
	generatePlayerRanksListForEmbed,
} = require("../components/lobbyEmbed.js");
const {
	GuildMember,
	Client,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	Interaction,
	ButtonInteraction,
} = require("discord.js");
const Draft = require("./Draft.js");

module.exports = (sequelize) => {
	/**
	 * @class Lobby
	 * @extends {Model}
	 */
	class Lobby extends Model {
		/**
		 * @property {number} lobby_id
		 * @property {number} season_id
		 * @property {number} season_lobby_id
		 * @property {string} lobby_name
		 * @property {Date} closed_date
		 * @property {bigint} host_id
		 * @property {number} draft_id
		 * @property {number} match_id
		 * @property {number} game_id
		 * @property {bigint} message_id
		 */

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
			const Draft = require("./Draft.js")(sequelize);
			const game = await Game.findOne({ where: { name: game_name } });
			return await Lobby.findAll({
				where: { closed_date: null, game_id: game.game_id },
				include: [
					User,
					Game,
					{
						model: User,
						as: "Host",
					},
					Draft,
				],
			});
		}

		/**
		 *
		 * @param {Client} client
		 * @param {GuildMember} host
		 * @param {boolean} send
		 */
		generateEmbed = async (client, host, send) => {
			const { channels } = require(`../../${process.env.CONFIG_FILE}`);

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
				inline: true,
			});
			// .addFields({
			// 	name: `Roles`,
			// 	value: generatePlayerRolesListForEmbed(playerList),
			// 	inline: true,
			// })
			// .addFields({
			// 	name: `Rank`,
			// 	value: generatePlayerRanksListForEmbed(playerList),
			// 	inline: true,
			// });

			if (reserves.length > 0) {
				embed.addFields({
					name: `Reserves (${reserves.length}/3)`,
					value: generatePlayerListForEmbed(reserves),
					inline: false,
				});
			}

			const components = await this.#getLobbyButtons();

			if (send) {
				const channel_id = channels["games"]["League of Legends"];
				const channel = await client.channels.fetch(channel_id);
				const user = await client.guild.members.fetch(host.user.id);
				const message = await user.send({
					embeds: [embed],
					components: [components],
				});
				console.log("message id", message.id);
				try {
					const previousMessage = await channel.messages.fetch(this.message_id);
					if (previousMessage) {
						await previousMessage.delete();
					}
				} catch (err) {
					console.log("No previous message found.");
				}

				this.message_id = message.id;
				await this.save();
			}

			return { embed, components };
		};

		generateDraftEmbed = async (client, host, send) => {
			const { channels } = require(`../../${process.env.CONFIG_FILE}`);

			let playerList = [];
			let reserves = [];
			const users = await this.getUsers({
				order: [[Sequelize.literal("LobbyUsers.created_at"), "ASC"]],
				through: {
					attributes: ["created_at"], // This will include the "created_at" field from the join table in the result
				},
			});

			//grab summoner name from first 10 users and put into playerList
			users.forEach((user) => {
				if (playerList.length < 10) {
					playerList.push(user.summoner_name);
				} else {
					reserves.push(user.summoner_name);
				}
			});

			const embed = lobbyEmbed(
				"Drafting in progress!",
				`Tentative Lobby ID: ${this.season_lobby_id}`,
				host,
				`${this.lobby_id}`
			);

			embed.addFields({
				name: `Joined Players (${playerList.length}/10)`,
				value: generatePlayerListForEmbed(playerList),
				inline: true,
			});

			const channel_id = channels["games"]["League of Legends"];
			const channel = await client.channels.fetch(channel_id);
			const user = await client.guild.members.fetch(host.user.id);
			const message = await user.send({
				embeds: [embed],
			});
			try {
				const previousMessage = await channel.messages.fetch(this.message_id);
				if (previousMessage) {
					await previousMessage.delete();
				}
			} catch (err) {
				console.log("No previous message found.");
			}
		};

		/**
		 *
		 * @returns {ActionRowBuilder}
		 */
		#getLobbyButtons = async () => {
			const joinButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Success)
				.setLabel("Join")
				.setCustomId(`join_${this.lobby_id}`);
			const dropButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Danger)
				.setLabel("Drop")
				.setCustomId(`drop_${this.lobby_id}`);
			const draftButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Primary)
				.setLabel("Draft")
				.setCustomId(`draft_${this.lobby_id}`);

			const components = new ActionRowBuilder();
			if ((await this.isJoinable()).joinable) {
				components.addComponents(joinButton);
			}
			if ((await this.isDroppable()).droppable) {
				components.addComponents(dropButton);
			}
			if ((await this.isDraftable()).draftable) {
				components.addComponents(draftButton);
			}

			return components;
		};

		/**
		 *
		 * @param {Interaction} interaction
		 * @param {string} action
		 */
		handleButton = async (interaction, action) => {
			const User = require("./User.js")(sequelize);
			console.log(interaction);
			const user = await User.findOne({
				where: { user_id: interaction.user.id },
			});
			if (action === "join") {
				await this.join(interaction, user.user_id);
			} else if (action === "drop") {
				await this.drop(interaction, user.user_id);
			} else if (action === "draft") {
				return await this.draft(interaction);
			}
			await this.generateEmbed(
				interaction.client,
				interaction.guild.members.fetch(user.user_id),
				true
			);
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
		 * @returns { {droppable: boolean, reason: string} }
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

		isDraftable = async () => {
			const lobbyUsers = await this.getUsers();
			if (lobbyUsers.length < 10) {
				return { draftable: false, reason: "Lobby is not full." };
			}

			return { draftable: true, reason: "" };
		};

		join = async (interaction, user_id) => {
			const { joinable, reason } = await this.isJoinable(user_id);
			if (!joinable) {
				message = await interaction.followUp({
					content: reason,
					ephemeral: true,
				});
				return;
			}

			await this.addUser(user_id);
		};
		drop = async (interaction, user_id) => {
			const { droppable, reason } = await this.isDroppable(user_id);
			if (!droppable) {
				message = await interaction.followUp({
					content: reason,
					ephemeral: true,
				});
				return;
			}

			await this.removeUser(user_id);
		};
		/**
		 *
		 * @param {ButtonInteraction} interaction
		 * @param {BigInt} user_id
		 * @returns
		 */
		draft = async (interaction, user_id) => {};

		pickPlayer = async (interaction, user_id) => {
			const { draftable, reason } = await this.isDraftable();
			if (interaction.user.id !== this.host_id) {
				message = await interaction.followUp({
					content: "Only the host can draft.",
					ephemeral: true,
				});
				return;
			}
			if (!draftable) {
				message = await interaction.followUp({
					content: reason,
					ephemeral: true,
				});
				return;
			}
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
				allowNull: true,
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
			draft_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			match_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			message_id: {
				type: DataTypes.BIGINT,
				allowNull: true,
			},
			thread_id: {
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
