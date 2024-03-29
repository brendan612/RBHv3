const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Match extends Model {}
	Match.init(
		{
			match_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			season_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			lobby_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			riot_match_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			start_time: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			end_time: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			winning_team: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			region_id: {
				type: DataTypes.STRING,
				allowNull: false,
				defaultValue: "NA",
			},
		},
		{
			sequelize,
			modelName: "Match",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Match;
};
