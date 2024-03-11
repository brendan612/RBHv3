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
		 * @property {string} host_id
		 * @property {number} draft_id
		 * @property {number} match_id
		 * @property {number} game_id
		 * @property {string} message_id
		 * @property {string} thread_id
		 * @property {number} game_mode_id
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
				type: DataTypes.STRING,
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
				type: DataTypes.STRING,
				allowNull: true,
			},
			thread_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			game_mode_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 1,
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
