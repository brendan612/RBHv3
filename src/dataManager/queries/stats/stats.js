const { User, Lobby, Match, MatchPlayer, Champion, Season, UserEloRating, DraftRound, Draft, sequelize, Sequelize } = require("../../../models");
const { Op } = require("sequelize");
const client = require("../../../client.js");
const { getLeaderboard } = require("../../../dataManager/queries/stats/leaderboard.js");

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
        const leaderboard = await getLeaderboard(game_id, season_id, region, 3, true);

        const leaderboardUser = leaderboard.find((u) => u.user_id === user_id);

        if (!leaderboardUser) {
            console.log("User not found in leaderboard, calculating stats manually.");
            const matches = await MatchPlayer.findAll({
                where: {
                    user_id: user_id,
                },
                include: [
                    {
                        model: Match,
                        where: {
                            game_id: game_id,
                            season_id: season_id,
                            region_id: region,
                            end_time: {
                                [Op.ne]: null,
                            },
                        },
                    },
                ],
            });

            console.log(matches.length, "matches found for user", user_id);

            if (matches.length === 0) {
                return {
                    wins: 0,
                    losses: 0,
                    rank: -1,
                    elo_rating: 800,
                };
            }

            const wins = matches.filter((m) => m.elo_change > 0).length;
            const losses = matches.filter((m) => m.elo_change < 0).length;

            const elo_rating = await UserEloRating.findOne({
                where: {
                    user_id,
                    season_id,
                    game_id,
                    region_id: region,
                },
            });

            console.log("elo_rating", elo_rating);

            return {
                wins,
                losses,
                rank: -1,
                elo_rating: elo_rating ? elo_rating.elo_rating : 800,
            };
        }

        const showRank = parseInt(leaderboardUser.wins) + parseInt(leaderboardUser.losses) >= 3;

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
    const user = await User.findByPk(user_id);
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
                    region_id: user.region_id,
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
    const user = await User.findByPk(user_id);
    const whereClause = {
        game_id: game_id,
        end_time: {
            [Op.ne]: null,
        },
        region_id: user.region_id,
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

    //take first 5 champions
    return Object.fromEntries(sortedChampionStats.slice(0, 5));
}

/**
 * @param {string} user_id
 * @param {number} game_id
 * @param {number} season_id
 * @returns {Promise<Object>} An object containing role stats for a user.
 * @property {number} wins - The number of wins.
 * @property {number} losses - The number of losses.
 */
async function getMostPlayedRoleForUser(user_id, game_id, season_id) {
    const user = await User.findByPk(user_id);
    const whereClause = {
        game_id: game_id,
        end_time: {
            [Op.ne]: null,
        },
        region_id: user.region_id,
    };

    if (season_id) {
        whereClause.season_id = season_id;
    }

    const matchPlayers = await MatchPlayer.findAll({
        where: {
            user_id: user_id,
            role: {
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

    const roleStats = {};

    for (const matchPlayer of matchPlayers) {
        if (!roleStats[matchPlayer.role]) {
            roleStats[matchPlayer.role] = {
                wins: 0,
                losses: 0,
            };
        }

        if (matchPlayer.elo_change > 0) {
            roleStats[matchPlayer.role].wins++;
        } else {
            roleStats[matchPlayer.role].losses++;
        }
    }

    const sortedRoleStats = Object.entries(roleStats).sort((a, b) => {
        const totalMatchesA = a[1].wins + a[1].losses;
        const totalMatchesB = b[1].wins + b[1].losses;
        return totalMatchesB - totalMatchesA;
    });

    const sortedRoleStatsObject = Object.fromEntries(sortedRoleStats);

    return sortedRoleStatsObject;
}

async function getVeteransForSeason(game_id, season_id, region_id) {
    const matchPlayers = await MatchPlayer.findAll({
        attributes: [
            "user_id",
            [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN elo_change < 0 THEN 1 ELSE 0 END`)), "losses"],
            [Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN elo_change > 0 THEN 1 ELSE 0 END`)), "wins"],
            [Sequelize.fn("COUNT", Sequelize.col("MatchPlayer.user_id")), "total_matches"],
        ],
        include: [
            {
                model: Match,
                attributes: [],
                where: {
                    game_id: game_id,
                    season_id: season_id,
                    region_id: region_id,
                },
            },
        ],
        group: ["MatchPlayer.user_id"],
        order: [[Sequelize.literal("total_matches"), "DESC"]],
        limit: 10,
    });

    return matchPlayers;
}

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 * @param {string} region_id
 * @returns {Promise<Match[]>} An array of matches played for a season.
 */
async function getMatchesPlayedForSeason(game_id, season_id, region_id) {
    const matches = await Match.findAll({
        where: {
            game_id,
            season_id,
            region_id,
            end_time: {
                [Op.ne]: null,
            },
        },
    });

    return matches;
}

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 * @param {string} region_id
 * @returns {Promise<Object[]>} An array of champion stats for a server.
 */
async function getChampionMatchDataForServer(game_id, season_id, region_id) {
    const seasonClause = season_id ? `AND m.season_id = ${season_id}` : "";
    const regionClause = region_id ? `AND m.region_id = '${region_id}'` : "";
    const [results, metadata] = await sequelize.query(`
		WITH ChampionWins AS (
			SELECT c.champion_id, c.name, COUNT(*) AS 'wins'
			FROM DraftRounds dr
			JOIN Drafts d ON dr.draft_id = d.draft_id 
			JOIN Matches m ON d.match_id = m.match_id
			JOIN Champions c ON dr.champion_id = c.champion_id 
			WHERE dr.\`type\` = 'pick'
			${regionClause}
			${seasonClause}
			AND m.game_id = ${game_id}
			AND m.end_time IS NOT NULL
			AND m.winning_team = dr.team 
			GROUP BY c.champion_id, c.name
			ORDER BY COUNT(*) DESC 
		), ChampionLosses AS (
			SELECT c.champion_id, c.name, COUNT(*) AS 'losses'
			FROM DraftRounds dr
			JOIN Drafts d ON dr.draft_id = d.draft_id 
			JOIN Matches m ON d.match_id = m.match_id
			JOIN Champions c ON dr.champion_id = c.champion_id 
			WHERE dr.\`type\` = 'pick'
			${regionClause}
			${seasonClause}
			AND m.game_id = ${game_id}
			AND m.end_time IS NOT NULL
			AND m.winning_team != dr.team 
			GROUP BY c.champion_id, c.name
			ORDER BY COUNT(*) DESC 
		)
		SELECT cw.champion_id, cw.name, cw.wins, cl.losses
		FROM ChampionWins cw
		JOIN ChampionLosses cl on cw.champion_id = cl.champion_id
	`);

    return results;
}

async function getCaptainStatsForServer(game_id, season_id, region_id) {
    const seasonClause = season_id ? `AND m.season_id = ${season_id}` : "";
    const regionClause = region_id ? `AND m.region_id = '${region_id}'` : "";
    const [results, metadata] = await sequelize.query(`
		WITH CaptainWins AS (
			SELECT u.user_id, u.summoner_name, COUNT(*) AS 'wins'
			FROM Drafts d
			JOIN Matches m ON d.match_id = m.match_id
			JOIN Users u ON d.red_captain_id = u.user_id OR d.blue_captain_id = u.user_id
			WHERE m.end_time IS NOT NULL
			${regionClause}
			${seasonClause}
			AND m.game_id = ${game_id}
			AND (
				( m.winning_team = 'red' AND d.red_captain_id = u.user_id )
				OR
				( m.winning_team = 'blue' AND d.blue_captain_id = u.user_id )
			)
			GROUP BY u.user_id, u.summoner_name
			ORDER BY COUNT(*) DESC 
		), CaptainLosses AS (
			SELECT u.user_id, u.summoner_name, COUNT(*) AS 'losses'
			FROM Drafts d
			JOIN Matches m ON d.match_id = m.match_id
			JOIN Users u ON d.red_captain_id = u.user_id OR d.blue_captain_id = u.user_id
			WHERE m.end_time IS NOT NULL
			${regionClause}
			${seasonClause}
			AND m.game_id = ${game_id}
			AND (
				( m.winning_team = 'red' AND d.blue_captain_id = u.user_id )
				OR
				( m.winning_team = 'blue' AND d.red_captain_id = u.user_id )
			)
			GROUP BY u.user_id, u.summoner_name
			ORDER BY COUNT(*) DESC 
		)
		SELECT cw.user_id, cw.summoner_name, cw.wins, cl.losses
		FROM CaptainWins cw
		JOIN CaptainLosses cl on cw.user_id = cl.user_id
	`);

    return results;
}

module.exports = {
    getStatsForUser,
    getSynergyStatsForUsers,
    getRecentMatchStatsForUser,
    getMostPlayedChampionForUser,
    getMostPlayedRoleForUser,
    getVeteransForSeason,
    getMatchesPlayedForSeason,
    getChampionMatchDataForServer,
    getCaptainStatsForServer,
};
