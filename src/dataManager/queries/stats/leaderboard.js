const { sequelize } = require("../../../models");

const client = require("../../../client.js");

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 * @param {string} region
 * @param {number} minimumMatches
 * @param {boolean} includeInactive
 * @returns {<Promise<Any[]>} An array of users.
 */
async function getLeaderboard(
	game_id,
	season_id,
	region,
	minimumMatches = 3,
	includeInactive = false
) {
	const cachedLeaderboard = client.cache.get(
		`leaderboard-${game_id}-${season_id}-${region}-${minimumMatches}-${includeInactive}`,
		"leaderboard"
	);

	if (cachedLeaderboard) {
		return cachedLeaderboard;
	}

	const includeInactiveClause = includeInactive
		? ""
		: "OR (E.elo_rating > 900 AND M.end_time > NOW() - INTERVAL 7 DAY)";

	const [results, metadata] = await sequelize.query(
		`
		SELECT
			user_id,
			summoner_name,
			tag_line,
			elo_rating,
			wins,
			losses,
			RANK() OVER (ORDER BY elo_rating DESC, (wins + losses) DESC) AS rank
		FROM (
			SELECT DISTINCT
				U.user_id,
				U.summoner_name,
				U.tag_line,
				E.elo_rating,
				(
					SELECT COUNT(*) 
					FROM MatchPlayers MP
					JOIN Matches M ON MP.match_id = M.match_id
					WHERE MP.user_id = U.user_id
					AND M.game_id = ${game_id}
					AND (${season_id ? `M.season_id = ${season_id}` : "true"})
					AND M.region = '${region}'
					AND MP.elo_change > 0
					AND M.end_time IS NOT NULL
				) AS wins,
				(
					SELECT COUNT(*) 
					FROM MatchPlayers MP
					JOIN Matches M ON MP.match_id = M.match_id
					WHERE MP.user_id = U.user_id
					AND M.game_id = ${game_id}
					AND (${season_id ? `M.season_id = ${season_id}` : "true"})
					AND M.region = '${region}'
					AND MP.elo_change < 0
					AND M.end_time IS NOT NULL
				) AS losses
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
					AND (E.elo_rating <= 900 ${includeInactiveClause})
					GROUP BY MP.user_id
					HAVING COUNT(MP.match_id) >= ${minimumMatches}
				)
				AND E.game_id = 1
				AND E.season_id = 28	
			ORDER BY 
				E.elo_rating DESC
		) AS leaderboard
	`
	);

	client.cache.set(
		`leaderboard-${game_id}-${season_id}-${region}-${minimumMatches}-${includeInactive}`,
		results,
		"leaderboard"
	);

	return results;
}

module.exports = {
	getLeaderboard,
};
