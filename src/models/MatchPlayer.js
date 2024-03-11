const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class MatchPlayer extends Model {
		/**
		 *
		 * @param {number} match_id
		 * @param {BigInt} user_id
		 * @param {String} team
		 * @param {Number} elo_change
		 * @returns {MatchPlayer}
		 */
		static async createMatchPlayer(match_id, user_id, team, elo_change) {
			return await MatchPlayer.create({
				match_id: match_id,
				user_id: user_id,
				team: team,
				elo_change: elo_change,
			});
		}
	}
	MatchPlayer.init(
		{
			match_player_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			match_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			user_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			team: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			elo_change: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			elo_before: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 800,
			},
			elo_after: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "MatchPlayer",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return MatchPlayer;
};
