const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class ModerationLog extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {Promise<ModerationLog>}
		 */
		static async createModerationLog(
			user_id,
			targeted_user_id,
			duration,
			type,
			reason
		) {
			console.log(user_id, targeted_user_id, duration, type, reason);
			return await ModerationLog.create({
				user_id: user_id,
				targeted_user_id: targeted_user_id,
				duration: duration,
				type: type,
				reason: reason,
			});
		}
	}
	ModerationLog.init(
		{
			ModerationLog_id: {
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
			targeted_user_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			duration: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			type: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			reason: {
				type: DataTypes.STRING,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "ModerationLog",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return ModerationLog;
};
