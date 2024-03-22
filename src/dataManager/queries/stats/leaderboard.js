const { sequelize } = require("../../../models");

const client = require("../../../client.js");

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 * @param {string} region
 * @param {number} minimumMatches
 * @returns {<Promise<Any[]>} An array of users.
 */
async function getLeaderboard(game_id, season_id, region, minimumMatches = 3) {
	const cachedLeaderboard = client.cache.get(
		`leaderboard-${game_id}-${season_id}-${region}-${minimumMatches}`
	);

	if (cachedLeaderboard) {
		console.log("Using cached leaderboard");
		console.log(cachedLeaderboard.length);
		return cachedLeaderboard;
	}

	const [results, metadata] = await sequelize.query(
		`SELECT 
			U.user_id,
			U.summoner_name,
			U.tag_line,
			E.elo_rating,
			(SELECT COUNT(*) 
			FROM MatchPlayers MP
			JOIN Matches M ON MP.match_id = M.match_id
			WHERE MP.user_id = U.user_id
			AND M.game_id = ${game_id}
			AND (${season_id ? `M.season_id = ${season_id}` : "true"})
			AND M.region = '${region}'
			AND MP.elo_change > 0
			AND M.end_time IS NOT NULL) AS wins,
			(SELECT COUNT(*) 
			FROM MatchPlayers MP
			JOIN Matches M ON MP.match_id = M.match_id
			WHERE MP.user_id = U.user_id
			AND M.game_id = ${game_id}
			AND (${season_id ? `M.season_id = ${season_id}` : "true"})
			AND M.region = '${region}'
			AND MP.elo_change < 0
			AND M.end_time IS NOT NULL) AS losses
		FROM 
			Users U
		JOIN 
			UserEloRatings E ON U.user_id = E.user_id
		WHERE 
			EXISTS (
				SELECT 1
				FROM MatchPlayers MP
				JOIN Matches M ON MP.match_id = M.match_id
				WHERE MP.user_id = U.user_id
				AND M.game_id = ${game_id}
				AND (${season_id ? `M.season_id = ${season_id}` : "true"})
				AND M.region = '${region}'
				AND M.end_time > NOW() - INTERVAL 7 DAY
				GROUP BY MP.user_id
				HAVING COUNT(MP.match_id) >= ${minimumMatches}
			)
		ORDER BY 
			E.elo_rating DESC
	`
	);

	client.cache.set(
		`leaderboard-${game_id}-${season_id}-${region}-${minimumMatches}`,
		results,
		"leaderboard"
	);

	return results;
}

module.exports = {
	getLeaderboard,
};
