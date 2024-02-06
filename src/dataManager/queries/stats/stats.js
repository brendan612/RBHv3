const {
	User,
	Lobby,
	Match,
	MatchPlayer,
	Season,
	sequelize,
	Sequelize,
} = require("../../../models");
const { Op } = require("sequelize");
const client = require("../../../client.js");

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
async function getStatsForUser(user_id, game_id, season_id) {
	try {
		let whereClause = {};
		if (season_id) {
			console.log("season_id", season_id);
			whereClause.season_id = season_id;
		}

		const matches = await Match.findAll({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				...whereClause,
			},
			include: [
				{
					model: MatchPlayer,
					attributes: ["match_id", "team", "elo_change"],
					required: true,
					where: { user_id: user_id },
				},
			],
		});

		const wins = matches.filter((match) => {
			return match.MatchPlayers[0].elo_change > 0;
		});

		const losses = matches.filter((match) => {
			return match.MatchPlayers[0].elo_change < 0;
		});

		let rank = -1;
		let rating = 1600;
		if (matches.length > 3) {
			const rankQuery = `
				SELECT summoner_name, elo_rating, ranking
				FROM (
					SELECT u.summoner_name, AVG(u.elo_rating) AS elo_rating,
						@rank := @rank + 1 AS ranking
					FROM (
						SELECT DISTINCT u.user_id, u.summoner_name, ur.elo_rating
						FROM users u
						JOIN matchplayers mp ON u.user_id = mp.user_id
						JOIN matches m ON mp.match_id = m.match_id
						join seasons s on m.season_id = s.season_id  
						JOIN usereloratings ur ON u.user_id = ur.user_id AND m.game_id = ur.game_id
						WHERE 
							(
								m.game_id = :game_id
								AND (:season_id IS NULL OR s.season_id = :season_id)
							)
						AND (:season_id is NULL OR ur.season_id = :season_id)
					) u, (SELECT @rank := 0) r
					GROUP BY u.user_id, u.summoner_name
					ORDER BY elo_rating DESC
				) AS ranked_users
				WHERE summoner_name = :summoner_name;
			`;

			const user = await User.findOne({
				where: { user_id: user_id },
			});

			const [res] = await sequelize.query(rankQuery, {
				replacements: {
					summoner_name: user.summoner_name,
					game_id: game_id,
					season_id: season_id === undefined ? null : season_id,
				},
				type: sequelize.QueryTypes.SELECT,
			});
			rank = parseInt(res.ranking);
			rating = parseInt(res.elo_rating);
		}

		return {
			wins: wins.length,
			losses: losses.length,
			rank: rank,
			elo_rating: rating,
		};
	} catch (err) {
		console.error(err);
		return null;
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
		let whereClause = {};
		if (season_id) {
			console.log("season_id", season_id);
			whereClause.season_id = season_id;
		}

		const matches = await Match.findAll({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				...whereClause,
			},
			include: [
				{
					model: MatchPlayer,
					attributes: ["match_id", "team", "elo_change"],
					required: true,
					where: {
						user_id: {
							[Op.in]: [user1_id, user2_id],
						},
					},
				},
			],
		});

		let winsWith = 0;
		let winsAgainst = 0;
		let lossesWith = 0;
		let lossesAgainst = 0;

		matches.forEach((match) => {
			const player1 = match.MatchPlayers.find((p) => p.user_id === user1_id);
			const player2 = match.MatchPlayers.find((p) => p.user_id === user2_id);

			if (player1 && player2) {
				if (player1.team === player2.team) {
					// Together
					if (player1.elo_change > 0) {
						// Assuming positive elo_change means a win
						winsWith++;
					} else {
						lossesWith++;
					}
				} else {
					// Against each other
					if (player1.elo_change > 0) {
						// Assuming player1 won
						winsAgainst++;
					} else {
						lossesAgainst++;
					}
				}
			}
		});

		return {
			winsWith,
			winsAgainst,
			lossesWith,
			lossesAgainst,
		};
	} catch {}
}

module.exports = {
	getStatsForUser,
	getSynergyStatsForUsers,
};
