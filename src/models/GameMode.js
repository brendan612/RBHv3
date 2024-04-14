const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
    class GameMode extends Model {
        /**
         *
         * @param {string} name
         * @returns {GameMode}
         */
        static async createGameMode(name) {
            return await GameMode.create({
                name: name,
            });
        }
    }
    GameMode.init(
        {
            game_mode_id: {
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
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            icon_url: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            emote: {
                type: DataTypes.STRING,
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
            modelName: "GameMode",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    );

    return GameMode;
};
