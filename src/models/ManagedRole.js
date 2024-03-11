const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ManagedRole extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {ManagedRole}
		 */
		static async createManagedRole(name) {
			return await ManagedRole.create({
				name: name,
			});
		}
	}
	ManagedRole.init(
		{
			managed_role_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			role_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			role_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			role_description: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			role_icon: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "ManagedRole",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ManagedRole;
};
