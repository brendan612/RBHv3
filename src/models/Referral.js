const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Referral extends Model {
		/**
		 *
		 * @param {bigint} user_id
		 * @param {bigint} referrer_id
		 * @returns
		 */
		static async createReferral(user_id, referrer_id) {
			return await Referral.create({
				user_id: user_id,
				referrer_id: referrer_id,
			});
		}
	}
	Referral.init(
		{
			referral_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			referrer_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Referral",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Referral;
};
