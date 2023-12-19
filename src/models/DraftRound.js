const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class DraftRound extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {DraftRound}
		 */
		static async createDraftRound(name) {
			return await DraftRound.create({
				name: name,
			});
		}
	}
	DraftRound.init(
		{
			draft_round_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			draft_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			round_number: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			type: {
				type: DataTypes.ENUM,
				values: ["ban", "pick"],
				allowNull: false,
			},
			team: {
				type: DataTypes.ENUM,
				values: ["red", "blue"],
				allowNull: false,
			},
			champion_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "DraftRound",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return DraftRound;
};
