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
				"user_id", // Direct attribute from User
				// Include 'elo_rating' from 'UserEloRatings' through subquery or direct association
				[
					sequelize.literal(
						`(SELECT elo_rating FROM UserEloRatings WHERE UserEloRatings.user_id = User.user_id ORDER BY UserEloRatings.created_at DESC LIMIT 1)`
					),
					"elo_rating",
				],
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
						where: {
							...(season_id && { season_id: season_id }),
							end_time: { [Op.ne]: null },
							game_id: game_id,
							region: region,
						},
					},
				],
			},
			{
				model: UserEloRating,
				as: "UserEloRatings", // Ensure this alias matches the association alias
				attributes: [], // You may not need to explicitly include attributes if they're being used outside the attributes array
				required: true,
			},
		],
		group: ["User.user_id", "UserEloRatings.elo_rating"],
		//prettier-ignore
		having: sequelize.literal(`(SELECT COUNT(*)
                                FROM MatchPlayers mp
                                INNER JOIN Matches m ON mp.match_id = m.match_id
                                WHERE mp.user_id = User.user_id
                                AND (${season_id ? `m.season_id = ${season_id}`: "true"})
                                AND m.end_time > NOW() - INTERVAL 7 DAY 
                                ) >= ${minimumMatches}`),
		order: [[sequelize.col("UserEloRatings.elo_rating"), "DESC"]], // Corrected order reference
		limit: limit,
		offset: offset,
	});

	return leaderboard;
}

module.exports = {
	getLeaderboard,
};
