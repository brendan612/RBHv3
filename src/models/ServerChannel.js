const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ServerChannel extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ServerChannel}
		 */
		static async createServerChannel(name) {
			return await ServerChannel.create({
				name: name,
			});
		}
	}
	ServerChannel.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
				defaultValue: 0,
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
			modelName: "ServerChannel",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ServerChannel;
};
