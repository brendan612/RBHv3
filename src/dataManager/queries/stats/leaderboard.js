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

	let [results, metadata] = await sequelize.query(
		`
			WITH RecentMatches AS (
				SELECT
					MP.user_id,
					COUNT(MP.match_id) AS recent_match_count,
					MAX(M.end_time) AS last_active
				FROM
					MatchPlayers MP
				JOIN
					Matches M ON MP.match_id = M.match_id
				WHERE
					M.game_id = ${game_id}
					AND (${season_id ? `M.season_id = ${season_id}` : "true"})
					AND M.region_id = '${region}'
					AND M.end_time IS NOT NULL
				GROUP BY
					MP.user_id
			),
			UserElo AS (
				SELECT
					U.user_id,
					U.summoner_name,
					U.tag_line,
					E.elo_rating,
					IFNULL(RM.recent_match_count, 0) AS recent_match_count,
					RM.last_active
				FROM
					Users U
				JOIN
					UserEloRatings E ON U.user_id = E.user_id
				LEFT JOIN
					RecentMatches RM ON U.user_id = RM.user_id
				WHERE
					E.game_id = ${game_id}
					AND (${season_id ? `E.season_id = ${season_id}` : "true"})
					AND LENGTH(U.user_id) > 5
			),
			UserStats AS (
				SELECT
					user_id,
					summoner_name,
					tag_line,
					elo_rating,
					(
						SELECT COUNT(*)
						FROM MatchPlayers MP
						JOIN Matches M ON MP.match_id = M.match_id
						WHERE MP.user_id = UE.user_id
						AND M.game_id = ${game_id}
						AND (${season_id ? `M.season_id = ${season_id}` : "true"})
						AND M.region_id = '${region}'
						AND MP.elo_change > 0
					) AS wins,
					(
						SELECT COUNT(*)
						FROM MatchPlayers MP
						JOIN Matches M ON MP.match_id = M.match_id
						WHERE MP.user_id = UE.user_id
						AND M.game_id = ${game_id}
						AND (${season_id ? `M.season_id = ${season_id}` : "true"})
						AND M.region_id = '${region}'
						AND MP.elo_change < 0
					) AS losses,
					UE.recent_match_count,
					UE.last_active
				FROM
					UserElo UE
			)
		SELECT DISTINCT
			user_id,
			summoner_name,
			tag_line,
			elo_rating,
			wins,
			losses,
			IF(elo_rating > 900 AND (last_active < NOW() - INTERVAL 7 DAY OR last_active IS NULL), 'Inactive', 'Active') AS activity_status,
			RANK() OVER (ORDER BY elo_rating DESC, wins DESC) AS 'rank'
		FROM
			UserStats
		WHERE recent_match_count >= ${minimumMatches}
		ORDER BY 'rank';
	`
	);

	if (results) {
		results = results.filter((user) => {
			return includeInactive || user.activity_status === "Active";
		});
	}

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
