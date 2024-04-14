const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
    class Champion extends Model {}
    Champion.init(
        {
            champion_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                unique: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            square_icon: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            loading_splash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            full_splash: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            sequelize,
            modelName: "Champion",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    );

    return Champion;
};
