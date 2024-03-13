const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ServerSetting extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ServerSetting}
		 */
		static async createServerSetting(name) {
			return await ServerSetting.create({
				name: name,
			});
		}
	}
	ServerSetting.init(
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
			modelName: "ServerSetting",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ServerSetting;
};
