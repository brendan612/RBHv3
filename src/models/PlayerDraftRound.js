const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class PlayerDraftRound extends Model {
	}
	PlayerDraftRound.init(
		{
			player_draft_round_id: {
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
			team: {
				type: DataTypes.ENUM,
				values: ["red", "blue"],
				allowNull: false,
			},
			user_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "PlayerDraftRound",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return PlayerDraftRound;
};
