const { Sequelize, DataTypes, Model } = require("sequelize");
require("dotenv").config();
const sequelize = new Sequelize(
	process.env.dbName,
	process.env.dbUser,
	process.env.dbPassword,
	{
		host: "localhost",
		port: 3306,
		dialect: "mysql",
		logging: false,
	}
);

const User = require("./User.js")(sequelize);
const Lobby = require("./Lobby.js")(sequelize);
const Game = require("./Game.js")(sequelize);
const Season = require("./Season.js")(sequelize);
const Referral = require("./Referral.js")(sequelize);

// Setting up many-to-many relationship
User.belongsToMany(Lobby, { through: "LobbyUsers" });
Lobby.belongsToMany(User, { through: "LobbyUsers" });
Lobby.hasOne(User, {
	foreignKey: "host_id",
	onDelete: "cascade",
	onUpdate: "cascade",
});
Game.hasMany(Lobby, {
	foreignKey: "game_id",
	onDelete: "cascade",
	onUpdate: "cascade",
});
Game.hasMany(Season, {
	foreignKey: "game_id",
	onDelete: "cascade",
	onUpdate: "cascade",
});

Referral.belongsTo(User, { foreignKey: "user_id", as: "User" });
Referral.belongsTo(User, { foreignKey: "referrer_id", as: "Referrer" });

User.hasMany(Referral, { foreignKey: "user_id" });
User.hasMany(Referral, { foreignKey: "referrer_id" });

module.exports = {
	sequelize,
	DataTypes,
	Model,
	User,
	Lobby,
	Game,
	Season,
	Referral,
};
