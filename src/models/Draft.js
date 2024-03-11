const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Draft extends Model {
		/**
		 *
		 * @param {int} lobby_id
		 * @returns {Draft}
		 */
		static async createDraft(lobby_id) {
			return await Draft.create({
				lobby_id,
			});
		}
	}
	Draft.init(
		{
			draft_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			match_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			lobby_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			host_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			red_captain_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			blue_captain_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			message_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			closed_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			thread_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: "Draft",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Draft;
};
