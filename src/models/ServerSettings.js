const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ServerMessage extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ServerMessage}
		 */
		static async createServerMessage(name) {
			return await ServerMessage.create({
				name: name,
			});
		}
	}
	ServerMessage.init(
		{
			message_id: {
				type: DataTypes.BIGINT,
				primaryKey: true,
				allowNull: false,
			},
			channel_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			type: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "ServerMessage",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ServerMessage;
};
