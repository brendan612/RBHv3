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
			},
			type: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			purpose: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			channel_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			parent_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			region_id: {
				type: DataTypes.STRING,
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
