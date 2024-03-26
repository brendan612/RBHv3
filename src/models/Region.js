const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Region extends Model {
		/**
		 *
		 * @param {bigint} user_id
		 * @returns
		 */
		static async createRegion(region_id, platform, region, enabled) {
			return await Region.create({
				region_id: region_id,
				platform: platform,
				region: region,
				enabled: enabled,
			});
		}
	}
	Region.init(
		{
			region_id: {
				type: DataTypes.STRING,
				allowNull: false,
				primaryKey: true,
				unique: true,
			},
			platform: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			region: {
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
			modelName: "Region",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Region;
};
