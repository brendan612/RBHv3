const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class Team extends Model {
		/**
		 *
		 * @param {string} name
		 * @returns {Team}
		 */
		static async createTeam(name) {
			return await Team.create({
				name: name,
			});
		}
	}
	Team.init(
		{
			team_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			abbreviation: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			team_size: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			team_capitan_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			game_mode_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			logo_url: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			region_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			tournament_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			enabled: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
		},
		{
			sequelize,
			modelName: "Team",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Team;
};
