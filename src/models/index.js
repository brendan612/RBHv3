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
const FeatureToggle = require("./FeatureToggle.js")(sequelize);

// Setting up many-to-many relationship
User.belongsToMany(Lobby, { through: "LobbyUsers", ...cascadeOptions });
Lobby.belongsToMany(User, { through: "LobbyUsers", ...cascadeOptions });
Lobby.belongsTo(User, { as: "Host", foreignKey: "host_id", ...cascadeOptions });
User.hasMany(Lobby, { foreignKey: "host_id" });
Game.hasMany(Lobby, {
	foreignKey: "game_id",
	...cascadeOptions,
});
Lobby.belongsTo(Game, { foreignKey: "game_id", ...cascadeOptions });
Game.hasMany(Season, {
	foreignKey: "game_id",
	...cascadeOptions,
});

// User model associations
User.hasMany(Referral, {
	as: "Referrals",
	foreignKey: "referrer_id",
	...cascadeOptions,
});

// Referral model associations
Referral.belongsTo(User, {
	as: "Referrer",
	foreignKey: "referrer_id",
	...cascadeOptions,
});

User.hasMany(ModerationLog, {
	foreignKey: "user_id",
	as: "ModerationLogs",
	...cascadeOptions,
});
User.hasMany(ModerationLog, {
	foreignKey: "targeted_user_id",
	as: "TargetedModerationLogs",
	...cascadeOptions,
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

ModerationLog.belongsTo(User, {
	foreignKey: "user_id",
	as: "User",
	...cascadeOptions,
});
ModerationLog.belongsTo(User, {
	foreignKey: "targeted_user_id",
	as: "TargetedUser",
	...cascadeOptions,
});
Lobby.hasOne(Draft, {
	foreignKey: "lobby_id",
	...cascadeOptions,
});
Draft.belongsTo(Lobby, { foreignKey: "lobby_id", ...cascadeOptions });
Draft.hasMany(PlayerDraftRound, {
	foreignKey: "draft_id",
	...cascadeOptions,
});
PlayerDraftRound.belongsTo(Draft, {
	foreignKey: "draft_id",
	...cascadeOptions,
});
PlayerDraftRound.belongsTo(User, { foreignKey: "user_id", ...cascadeOptions });
User.hasMany(PlayerDraftRound, { foreignKey: "user_id", ...cascadeOptions });
Draft.hasMany(DraftRound, {
	foreignKey: "draft_id",
	...cascadeOptions,
});
DraftRound.belongsTo(Draft, { foreignKey: "draft_id", ...cascadeOptions });
Lobby.hasOne(Match, {
	foreignKey: "lobby_id",
	...cascadeOptions,
});
Match.belongsTo(Lobby, {
	foreignKey: "lobby_id",
	...cascadeOptions,
});
Game.hasMany(Match, {
	foreignKey: "game_id",
	...cascadeOptions,
});
Season.hasMany(Match, {
	foreignKey: "season_game_id",
	...cascadeOptions,
});
Season.belongsTo(Game, { foreignKey: "game_id", ...cascadeOptions });
Match.belongsTo(Draft, { foreignKey: "draft_id", ...cascadeOptions });
Match.hasMany(MatchPlayer, {
	foreignKey: "match_id",
	...cascadeOptions,
});
MatchPlayer.belongsTo(User, { foreignKey: "user_id", ...cascadeOptions });
MatchPlayer.belongsTo(Match, { foreignKey: "match_id", ...cascadeOptions });
User.hasMany(MatchPlayer, { foreignKey: "user_id", ...cascadeOptions });

AutoResponse.belongsTo(User, { foreignKey: "created_by", ...cascadeOptions });

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
	FeatureToggle,
};
