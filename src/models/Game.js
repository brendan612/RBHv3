const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Game extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {Game}
		 */
		static async createGame(name) {
			return await Game.create({
				name: name,
			});
		}
	}
	Game.init(
		{
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Game",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Game;
};
