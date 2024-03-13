const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ServerEmoji extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ServerEmoji}
		 */
		static async createServerEmoji(name) {
			return await ServerEmoji.create({
				name: name,
			});
		}
	}
	ServerEmoji.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			type: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			value: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "ServerEmoji",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ServerEmoji;
};
