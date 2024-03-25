const { Events, ActivityType } = require("discord.js");
const webhookServer = require("../handlers/voteHandler");
const {
	checkAndUpdateServerMessages,
} = require("../handlers/serverMessageHandler");
const { channels } = require(`../../${process.env.CONFIG_FILE}`);
const {
	ServerMessage,
	Match,
	Lobby,
	Draft,
	MatchPlayer,
	User,
	Season,
	Game,
	UserEloRating,
	Referral,
	FeatureToggle,
	AutoResponse,
	sequelize,
} = require("../models");

const ChampionService = require("../dataManager/services/championService");

const { row, resolve } = require("mathjs");

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("src/database_prod.db");

let old_users = [];
let old_seasons = [];

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity("Hosting Inhouses for RBH", {
			type: ActivityType.Custom,
		});
		client.guild = await client.guilds.fetch(client.guildID);

		const args = process.argv.slice(2);
		if (args.includes("--sync")) {
			await sequelize.sync({ force: true });
			await createUsers(db);
			await createGames();
			await createSeasons(db);
			await createLobbies(db);
			await createMatchPlayers(db);
			await createUserEloRating(db);
			await createReferrals(db);
			await createAutoResponses(db);
		}

		const features = await FeatureToggle.findAll();

		for (const feature of features) {
			client.features.set(feature.name, feature.enabled);
		}

		webhookServer.start();

		await checkAndUpdateServerMessages();

		const championService = new ChampionService();
		await championService.cacheAutocompleteChampionData();

		const invites = await client.guild.invites.fetch();
		invites.forEach((invite) => {
			client.invites.set(invite.code, invite.uses);
		});
	},
};

const createUsers = async (db) => {
	return new Promise((resolve, reject) => {
		db.all("select * from users", [], async (err, rows) => {
			if (err) {
				throw err;
			}
			const users = [];
			for (const row of rows) {
				const translatedData = {
					user_id: row.pid,
					summoner_name: row.verifiedSummonerName?.toString()?.trim(),
					verified: 0,
					server_money: row.money,
					server_experience: row.exp,
					join_date: new Date(),
				};
				users.push(translatedData);
			}
			old_users = users;
			try {
				await User.bulkCreate(users);
				console.log("Users synced");
				resolve();
			} catch (err) {}
		});
	});
};

const createGames = async () => {
	await Game.createGame("League of Legends");
};
const createSeasons = async (db) => {
	return new Promise((resolve, reject) => {
		db.all("select * from seasons where gameId = 1", [], async (err, rows) => {
			if (err) {
				throw err;
			}
			const seasons = [];
			for (const row of rows) {
				const translatedData = {
					name: row.seasonName,
					start_date: new Date(row.seasonStarted * 1000),
					end_date: new Date(row.seasonEnded * 1000),
					game_id: 1,
					season_game_id: row.pid,
				};
				seasons.push(translatedData);
			}
			old_seasons = seasons;
			try {
				await Season.bulkCreate(seasons);
				console.log("Seasons synced");
				resolve();
			} catch (err) {}
		});
	});
};
const createLobbies = async (db) => {
	return new Promise((resolve, reject) => {
		db.all(
			"select * from lobbies where seasonId in (select pid from seasons where gameId = 1)",
			[],
			async (err, rows) => {
				if (err) {
					throw err;
				}
				try {
					const matches = [];
					const lobbies = [];
					for (const row of rows) {
						const translatedData = translateDataToMatch(row);
						matches.push(translatedData);
						const translatedLobbyData = translateDataToLobby(row);
						try {
							await Lobby.create(translatedLobbyData);
						} catch {
							const host = await User.createUser(row.hostId, new Date());
							await Lobby.create(translatedLobbyData);
						}
					}
					await Match.bulkCreate(matches);
					console.log("Lobbies and Matches synced");
					resolve();
				} catch (err) {
					console.log(err);
					reject();
				}
			}
		);
	});
};

const createMatchPlayers = async (db) => {
	try {
		const matches = await Match.findAll();
		// console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(matches[0])));
		const chunkSize = 5; // Adjust this size based on your database capabilities

		const failures = [];
		// Split the matches into chunks for batch processing
		for (let i = 0; i < matches.length; i += chunkSize) {
			const matchChunk = matches.slice(i, i + chunkSize);
			await Promise.all(
				matchChunk.map(async (match) => {
					const rows2 = await new Promise((resolve, reject) => {
						db.all(
							`select * from lobby_players where lobbyId = '${match.match_id}'`,
							[],
							(err, rows) => {
								if (err) {
									reject(err);
								}
								resolve(rows);
							}
						);
					});

					const players = [];
					for (const row2 of rows2) {
						const translatedData2 = translateDataToMatchPlayer(row2);
						players.push(translatedData2);
					}

					try {
						for (var player of players) {
							try {
								await MatchPlayer.create({
									match_id: player.match_id,
									user_id: player.user_id,
									team: player.team,
									elo_change: player.elo_change,
									elo_before: 800,
									elo_after: 800,
								});
							} catch (err) {
								await User.createUser(player.user_id, new Date());
								try {
									await MatchPlayer.create({
										match_id: player.match_id,
										user_id: player.user_id,
										team: player.team,
										elo_change: player.elo_change,
										elo_before: 800,
										elo_after: 800,
									});
								} catch {
									console.log("PLAYER:" + player);
								}
							}
						}
					} catch (err) {
						console.error(err);
						failures.push(match.match_id);
					}
				})
			);
		}

		console.log("Failures\n", failures);
	} catch (err) {
		console.error(err);
	}
};

const createUserEloRating = async (db) => {
	return new Promise(async (resolve, reject) => {
		try {
			const seasons = await Season.findAll({
				where: { game_id: 1 },
			});
			const game = await Game.findOne({ where: { game_id: 1 } });
			const data = [];
			for (var season of seasons) {
				for (var user of old_users) {
					data.push({
						user_id: user.user_id,
						game_id: game.game_id,
						season_id: season.season_id,
						elo_rating: user.elo ?? 800,
					});
				}
			}

			await UserEloRating.bulkCreate(data);
			console.log("UserEloRatings synced");
			resolve();
		} catch (err) {
			console.error(err);
			reject();
		}
	});
};

const createReferrals = async (db) => {
	return new Promise(async (resolve, reject) => {
		try {
			const rows = await new Promise((resolve, reject) => {
				db.all(
					"SELECT CAST(referrerPID AS TEXT) as referrer_id, CAST(userPID AS TEXT) as user_id FROM referrals",
					[],
					(err, rows) => {
						if (err) {
							reject(err);
						}
						resolve(rows);
					}
				);
			});

			const data = [];
			for (const row of rows) {
				const userExists = await User.findByPk(row.user_id);
				const referrerExists = await User.findByPk(row.referrer_id);

				if (userExists && !referrerExists) {
					data.push({
						user_id: row.user_id,
						referrer_id: row.user_id,
					});
				} else if (userExists && referrerExists) {
					data.push({
						user_id: row.user_id,
						referrer_id: row.referrer_id,
					});
				}
			}

			await Referral.bulkCreate(data);
			console.log("Referrals synced");
			resolve();
		} catch (err) {
			console.log(err);
			reject();
		}
	});
};

const createAutoResponses = async (db) => {
	return new Promise(async (resolve, reject) => {
		try {
			const rows = await new Promise((resolve, reject) => {
				db.all("SELECT * FROM lcr_commands", [], (err, rows) => {
					if (err) {
						reject(err);
					}
					resolve(rows);
				});
			});

			const data = [];
			for (const row of rows) {
				data.push({
					trigger: row.name,
					response: row.value,
				});
			}

			await AutoResponse.bulkCreate(data);
			console.log("AutoResponses synced");
			resolve();
		} catch (err) {
			console.log(err);
			reject();
		}
	});
};

const translateDataToMatch = (sqliteRow) => {
	let seasonIndex = old_seasons.findIndex(
		(season) => season.season_game_id === sqliteRow.seasonId
	);

	let season_id = -1;
	if (seasonIndex !== -1) {
		season_id = seasonIndex;
	} else {
	}
	return {
		match_id: sqliteRow.pid,
		game_id: 1,
		season_id: season_id,
		lobby_id: sqliteRow.pid,
		host_id: sqliteRow.hostId,
		riot_match_id: null,
		start_time: new Date(sqliteRow.time_started * 1000),
		end_time: new Date(sqliteRow.time_started * 1000),
		winning_team: sqliteRow.winningTeam == 2 ? "red" : "blue",
	};
};

const translateDataToLobby = (sqliteRow) => {
	return {
		lobby_id: sqliteRow.pid,
		season_id: sqliteRow.seasonId,
		season_lobby_id: sqliteRow.gameCount,
		lobby_name: `Lobby ${sqliteRow.pid}`,
		closed_date: new Date(sqliteRow.time_started * 1000),
		host_id: sqliteRow.hostId,
		game_id: 1,
		match_id: sqliteRow.pid,
	};
};

/**
 *
 * @param {*} sqliteRow
 * @returns MatchPlayer
 */
const translateDataToMatchPlayer = (sqliteRow) => {
	return {
		match_id: sqliteRow.lobbyId,
		user_id: sqliteRow.uid,
		team: sqliteRow.teamId == 2 ? "red" : "blue",
		elo_change: sqliteRow.eloChange,
	};
};

const translateDataToDraft = (sqliteRow) => {
	return {
		match_id: sqliteRow.pid,
		lobby_id: sqliteRow.pid,
	};
};

const translateDataToDraftPick = (sqliteRow, draft_id) => {
	return {
		lobby_id: sqliteRow.pid,
		round_number: sqliteRow.pickOrder,
		user_id: sqliteRow.uid,
		team: sqliteRow.teamId == 2 ? "red" : "blue",
	};
};
