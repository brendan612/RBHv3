const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ReferralCode extends Model {
		/**
		 *
		 * @param {string} user_id
		 * @returns {Promise<ReferralCode>}
		 */
		static async createReferralCode(user_id) {
			return await ReferralCode.create({
				user_id: user_id,
			});
		}
	}
	ReferralCode.init(
		{
			referral_code_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			code: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			uses: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
		},
		{
			sequelize,
			modelName: "ReferralCode",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ReferralCode;
};
