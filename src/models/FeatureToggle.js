const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class FeatureToggle extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {FeatureToggle}
		 */
		static async createFeatureToggle(name) {
			return await FeatureToggle.create({
				name: name,
			});
		}
	}
	FeatureToggle.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			enabled: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
		},
		{
			sequelize,
			modelName: "FeatureToggle",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return FeatureToggle;
};
