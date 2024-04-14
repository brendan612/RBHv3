const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
    class Tournament extends Model {
        /**
         *
         * @param {string} name
         * @returns {Tournament}
         */
        static async createTournament(name) {
            return await Tournament.create({
                name: name,
            });
        }
    }
    Tournament.init(
        {
            tournament_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            type: {
                type: DataTypes.STRING,
                values: ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN"],
                allowNull: false,
            },
            game_mode_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            start_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            end_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING,
                values: ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED", "REGISTRATION_PERIOD"],
                allowNull: false,
            },
            registration_start_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            registration_end_date: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            registration_type: {
                type: DataTypes.STRING,
                values: ["OPEN", "INVITE_ONLY", "LEADERBOARD"],
                allowNull: false,
            },
            registration_type_leaderboard_cutoff: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            team_size: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            team_count: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            team_limit: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            game_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            region_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            season_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            seeding: {
                type: DataTypes.STRING,
                values: ["RANDOM", "RANKED"],
                allowNull: false,
            },
            created_by: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            prize_details: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "Tournament",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    );

    return Tournament;
};
