const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ServerRole extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ServerRole}
		 */
		static async createServerRole(name) {
			return await ServerRole.create({
				name: name,
			});
		}
	}
	ServerRole.init(
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
			modelName: "ServerRole",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ServerRole;
};
