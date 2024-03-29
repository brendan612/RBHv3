const {
	User,
	Lobby,
	Match,
	MatchPlayer,
	Champion,
	Season,
	sequelize,
	Sequelize,
} = require("../../../models");
const { Op } = require("sequelize");
const client = require("../../../client.js");
const {
	getLeaderboard,
} = require("../../../dataManager/queries/stats/leaderboard.js");

/**
 *
 * @param {bigint} user_id
 * @param {int} game_id
 * @param {int} season_id
 * @returns {Object} An object containing various stats.
 * @property {number} wins - The number of wins.
 * @property {number} losses - The number of losses.
 * @property {number} rank - The current rank.
 * @property {number} elo_rating - Rating for provided season or average over all seasons.
 */
async function getStatsForUser(user_id, game_id, season_id, region = "NA") {
	try {
		const leaderboard = await getLeaderboard(
			game_id,
			season_id,
			region,
			3,
			true
		);

		const leaderboardUser = leaderboard.find((u) => u.user_id === user_id);

		if (!leaderboardUser) {
			return {
				wins: 0,
				losses: 0,
				rank: -1,
				elo_rating: 800,
			};
		}

		const showRank =
			parseInt(leaderboardUser.wins) + parseInt(leaderboardUser.losses) >= 3;

		return {
			wins: leaderboardUser.wins,
			losses: leaderboardUser.losses,
			rank: showRank ? leaderboardUser.rank : -1,
			elo_rating: leaderboardUser.elo_rating,
		};
	} catch (err) {
		console.error(err);
		return {
			wins: 0,
			losses: 0,
			rank: -1,
			elo_rating: 800,
		};
	}
}

/**
 *
 * @param {bigint} user1_id
 * @param {bigint} user2_id
 * @param {int} game_id
 * @param {int} season_id
 * @returns {Object} An object containing various stats.
 * @property {number} winsWith - The number of wins when playing together.
 * @property {number} winsAgainst - The number of wins when playing against each other.
 * @property {number} lossesWith - The number of losses when playing together.
 * @property {number} lossesAgainst - The number of losses when playing against each other.
 */
async function getSynergyStatsForUsers(user1_id, user2_id, game_id, season_id) {
	try {
		const seasonClause = season_id ? `AND m.season_id = ${season_id}` : "";

		const rawQuery = `
			SELECT m.match_id, m.winning_team, mp.team as p1_team, mp2.team as p2_team FROM Matches m 
			JOIN MatchPlayers mp ON m.match_id = mp.match_id 
			JOIN MatchPlayers mp2 ON m.match_id = mp2.match_id 
			WHERE m.game_id = 1
			AND m.end_time IS NOT NULL
			${seasonClause}
			AND mp.user_id = '${user1_id}'
			AND mp2.user_id = '${user2_id}'
			AND mp.user_id != mp2.user_id;
		`;

		const matches = await sequelize.query(rawQuery, {
			type: sequelize.QueryTypes.SELECT,
		});

		let winsWith = 0;
		let winsAgainst = 0;
		let lossesWith = 0;
		let lossesAgainst = 0;

		matches.forEach((match) => {
			if (match.p1_team === match.p2_team) {
				if (match.p1_team === match.winning_team) {
					winsWith++;
				} else {
					lossesWith++;
				}
			} else {
				if (match.p1_team === match.winning_team) {
					winsAgainst++;
				} else {
					lossesAgainst++;
				}
			}
		});

		return {
			winsWith,
			winsAgainst,
			lossesWith,
			lossesAgainst,
		};
	} catch (err) {
		console.error(err);
		return null;
	}
}

async function getRecentMatchStatsForUser(user_id, game_id, season_id) {
	const matchPlayers = await MatchPlayer.findAll({
		where: {
			user_id: user_id,
		},
		include: [
			{
				model: Match,
				where: {
					game_id: game_id,
					season_id: season_id,
				},
			},
			{
				model: Champion,
			},
		],
		order: [["created_at", "DESC"]],
		limit: 5,
	});

	return matchPlayers;
}

/**
 *
 * @param {string} user_id
 * @param {number} game_id
 * @param {number} season_id
 * @returns {Promise<Object>} An object containing champion stats for a user.
 * @property {number} wins - The number of wins.
 * @property {number} losses - The number of losses.
 */
async function getMostPlayedChampionForUser(user_id, game_id, season_id) {
	const whereClause = {
		game_id: game_id,
		end_time: {
			[Op.ne]: null,
		},
	};

	if (season_id) {
		whereClause.season_id = season_id;
	}

	const matchPlayers = await MatchPlayer.findAll({
		where: {
			user_id: user_id,
			champion_id: {
				[Op.ne]: null,
			},
		},
		include: [
			{
				model: Match,
				where: whereClause,
			},
		],
	});

	const championStats = {};

	for (const matchPlayer of matchPlayers) {
		//i couldn't get matchPlayer.Champion to work so i had to do this
		const champion = await Champion.findByPk(matchPlayer.champion_id);
		if (!championStats[champion.name]) {
			championStats[champion.name] = {
				wins: 0,
				losses: 0,
			};
		}

		if (matchPlayer.elo_change > 0) {
			championStats[champion.name].wins++;
		} else {
			championStats[champion.name].losses++;
		}
	}

	const sortedChampionStats = Object.entries(championStats).sort((a, b) => {
		const totalMatchesA = a[1].wins + a[1].losses;
		const totalMatchesB = b[1].wins + b[1].losses;
		return totalMatchesB - totalMatchesA;
	});

	const sortedChampionStatsObject = Object.fromEntries(sortedChampionStats);

	return sortedChampionStatsObject;
}

module.exports = {
	getStatsForUser,
	getSynergyStatsForUsers,
	getRecentMatchStatsForUser,
	getMostPlayedChampionForUser,
};
