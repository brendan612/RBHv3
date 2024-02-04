const { Sequelize, DataTypes, Model } = require("sequelize");
require("dotenv").config();
const sequelize = new Sequelize(
	process.env.DBNAME,
	process.env.DBUSER,
	process.env.DBPASSWORD,
	{
		host: process.env.DBHOST,
		port: process.env.DBPORT,
		dialect: "mysql",
		logging: false,
	}
);

const cascadeOptions = {
	onDelete: "cascade",
	onUpdate: "cascade",
};

const ServerMessage = require("./ServerMessage.js")(sequelize);
const ModerationLog = require("./ModerationLog.js")(sequelize);
const User = require("./User.js")(sequelize);
const UserEloRating = require("./UserEloRating.js")(sequelize);
const Game = require("./Game.js")(sequelize);
const Season = require("./Season.js")(sequelize);
const Lobby = require("./Lobby.js")(sequelize);
const Draft = require("./Draft.js")(sequelize);
const PlayerDraftRound = require("./PlayerDraftRound.js")(sequelize);
const DraftRound = require("./DraftRound.js")(sequelize);
const Match = require("./Match.js")(sequelize);
const MatchPlayer = require("./MatchPlayer.js")(sequelize);
const Referral = require("./Referral.js")(sequelize);
const Champion = require("./Champion.js")(sequelize);
const AutoResponse = require("./AutoResponse.js")(sequelize);

// Setting up many-to-many relationship
User.belongsToMany(Lobby, { through: "LobbyUsers" });
Lobby.belongsToMany(User, { through: "LobbyUsers" });
Lobby.belongsTo(User, { as: "Host", foreignKey: "host_id" });
User.hasMany(Lobby, { foreignKey: "host_id" });
Game.hasMany(Lobby, {
	foreignKey: "game_id",
	...cascadeOptions,
});
Lobby.belongsTo(Game, { foreignKey: "game_id" });
Game.hasMany(Season, {
	foreignKey: "game_id",
	...cascadeOptions,
});

// User model associations
User.hasMany(Referral, { as: "Referrals", foreignKey: "referrer_id" });

// Referral model associations
Referral.belongsTo(User, { as: "Referrer", foreignKey: "referrer_id" });

User.hasMany(ModerationLog, { foreignKey: "user_id", as: "ModerationLogs" });
User.hasMany(ModerationLog, {
	foreignKey: "targeted_user_id",
	as: "TargetedModerationLogs",
});

User.hasMany(UserEloRating, {
	foreignKey: "user_id",
	as: "UserEloRatings",
	...cascadeOptions,
});
UserEloRating.belongsTo(User, {
	foreignKey: "user_id",
	as: "User",
	...cascadeOptions,
});
UserEloRating.belongsTo(Game, {
	foreignKey: "game_id",
	as: "Game",
	...cascadeOptions,
});
UserEloRating.belongsTo(Season, {
	foreignKey: "season_id",
	as: "Season",
	...cascadeOptions,
});

ModerationLog.belongsTo(User, { foreignKey: "user_id", as: "User" });
ModerationLog.belongsTo(User, {
	foreignKey: "targeted_user_id",
	as: "TargetedUser",
});
Lobby.hasOne(Draft, {
	foreignKey: "lobby_id",
	...cascadeOptions,
});
Draft.belongsTo(Lobby, { foreignKey: "lobby_id" });
Draft.hasMany(PlayerDraftRound, {
	foreignKey: "draft_id",
	...cascadeOptions,
});
PlayerDraftRound.belongsTo(Draft, { foreignKey: "draft_id" });
PlayerDraftRound.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(PlayerDraftRound, { foreignKey: "user_id" });
Draft.hasMany(DraftRound, {
	foreignKey: "draft_id",
	...cascadeOptions,
});
DraftRound.belongsTo(Draft, { foreignKey: "draft_id" });
Lobby.hasOne(Match, {
	foreignKey: "lobby_id",
	...cascadeOptions,
});
Match.belongsTo(Lobby, {
	foreignKey: "lobby_id",
});
Game.hasMany(Match, {
	foreignKey: "game_id",
	...cascadeOptions,
});
Season.hasMany(Match, {
	foreignKey: "season_game_id",
	...cascadeOptions,
});
Season.belongsTo(Game, { foreignKey: "game_id" });
Match.belongsTo(Draft, { foreignKey: "draft_id" });
Match.hasMany(MatchPlayer, {
	foreignKey: "match_id",
	...cascadeOptions,
});
MatchPlayer.belongsTo(User, { foreignKey: "user_id" });
MatchPlayer.belongsTo(Match, { foreignKey: "match_id" });
User.hasMany(MatchPlayer, { foreignKey: "user_id" });

AutoResponse.belongsTo(User, { foreignKey: "created_by" });

module.exports = {
	sequelize,
	Sequelize,
	DataTypes,
	Model,
	ServerMessage,
	User,
	UserEloRating,
	Referral,
	Lobby,
	Game,
	Season,
	Referral,
	ModerationLog,
	Match,
	MatchPlayer,
	Draft,
	PlayerDraftRound,
	DraftRound,
	Champion,
	AutoResponse,
};
