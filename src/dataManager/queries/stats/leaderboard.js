const {
	User,
	MatchPlayer,
	Match,
	UserEloRating,
	sequelize,
} = require("../../../models");

const { Op, literal } = require("sequelize");

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 * @param {number} limit
 * @param {number} offset
 * @param {string} region
 * @param {number} minimumMatches
 * @returns {<Promise<User[]>} An array of users.
 */
async function getLeaderboard(
	game_id,
	season_id,
	limit,
	offset,
	region,
	minimumMatches = 3
) {
	const leaderboard = await User.findAll({
		attributes: {
			include: [
				"user_id",
				"UserEloRatings.elo_rating",
				[
					sequelize.literal(`
                    (SELECT COUNT(*)
                     FROM MatchPlayers mp
                     INNER JOIN Matches m ON mp.match_id = m.match_id
                     WHERE mp.user_id = User.user_id
                     AND (${season_id ? `m.season_id = ${season_id}` : "true"}) 
                     AND mp.elo_change > 0
                     AND m.end_time > NOW() - INTERVAL 7 DAY )`),
					"wins",
				],
				[
					sequelize.literal(`
                    (SELECT COUNT(*)
                     FROM MatchPlayers mp
                     INNER JOIN Matches m ON mp.match_id = m.match_id
                     WHERE mp.user_id = User.user_id
                     AND (${season_id ? `m.season_id = ${season_id}` : "true"}) 
                     AND mp.elo_change < 0
                     AND m.end_time > NOW() - INTERVAL 7 DAY )`),
					"losses",
				],
			],
		},
		include: [
			{
				model: MatchPlayer,
				attributes: [],
				required: true,
				include: [
					{
						model: Match,
						attributes: [],
						required: true,
						where: {
							...(season_id && { season_id: season_id }), // Only include season_id in the where clause if it's provided
							end_time: {
								[Op.ne]: null, // Ensures the match has concluded
							},
							game_id: game_id,
							region: region,
						},
					},
				],
			},
			{
				model: UserEloRating,
				as: "UserEloRatings",
				required: true,
			},
		],
		group: ["User.user_id", "UserEloRatings.elo_rating"],
		//prettier-ignore
		having: sequelize.literal(`(SELECT COUNT(*)
                                  FROM MatchPlayers mp
                                  INNER JOIN Matches m ON mp.match_id = m.match_id
                                  WHERE mp.user_id = User.user_id
                                  AND (${season_id ? `m.season_id = ${season_id}` : "true" })
                                  AND m.end_time > NOW() - INTERVAL 7 DAY 
                                  ) >= ${minimumMatches}`),
		order: [[sequelize.literal(`"UserEloRatings".elo_rating`), "DESC"]],
		limit: limit,
		offset: offset,
	});

	return leaderboard;
}

module.exports = {
	getLeaderboard,
};
