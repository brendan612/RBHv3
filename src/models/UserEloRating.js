const { DataTypes, Model, UniqueConstraintError, Op } = require("sequelize");
const { baseEmbed } = require("../components/embed.js");
const { LeagueTier } = require("../components/leagueRankedEnums.js");
const {
	ButtonBuilder,
	ButtonStyle,
	Interaction,
	ActionRowBuilder,
	GuildMember,
	Client,
} = require("discord.js");

module.exports = (sequelize) => {
	class UserEloRating extends Model {
		/**
		 *
		 * @param {bigint} user_id
		 * @param {number} game_id
		 * @param {number} season_id
		 * @param {number} elo_rating
		 * @returns {UserEloRating}
		 */
		static async createUserEloRating(user_id, game_id, season_id, elo_rating) {
			try {
				return await UserEloRating.create({
					user_id: user_id,
					game_id: game_id,
					season_id: season_id,
					elo_rating: elo_rating,
				});
			} catch (e) {
				if (e instanceof UniqueConstraintError) {
					console.log("User already exists");
					return this.getUser(user_id);
				}
			}
		}
	}
	UserEloRating.init(
		{
			user_elo_rating_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			season_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			elo_rating: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 800,
			},
		},
		{
			sequelize,
			modelName: "UserEloRating",
			createdAt: "created_at",
			updatedAt: "updated_at",
			indexes: [
				{
					name: "user_game_season_index",
					unique: false,
					fields: ["user_id", "game_id", "season_id"],
				},
				{
					name: "user_index",
					unique: false,
					fields: ["user_id"],
				},
				{
					name: "game_index",
					unique: false,
					fields: ["game_id"],
				},
				{
					name: "season_index",
					unique: false,
					fields: ["season_id"],
				},
				{
					name: "elo_rating_index",
					unique: false,
					fields: ["elo_rating"],
				},
			],
		}
	);

	return UserEloRating;
};
