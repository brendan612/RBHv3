const {
	Lobby,
	Match,
	MatchPlayer,
	Season,
	sequelize,
	Sequelize,
	User,
} = require("../../../models");
const { Op } = require("sequelize");
const client = require("../../../client.js");
/**
 *
 * @param {BigInt} user_id
 * @param {int} game_id
 * @param {int} season_id
 * @returns {int}
 */
async function getTotalMatchesForUser(user_id, game_id, season_id) {
	try {
		return await Match.count({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				season_id: season_id,
			},
			include: [
				{
					model: MatchPlayer,
					attributes: ["match_id"],
					required: true,
					where: { user_id: user_id },
				},
			],
		});
	} catch {
		return -1;
	}
}

/**
 *
 * @param {int} game_id
 * @param {int} season_id
 * @returns {int}
 */
async function getTotalMatchesForServer(game_id, season_id) {
	try {
		return await Match.count({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				season_id: season_id,
			},
		});
	} catch {
		return -1;
	}
}

/**
 *
 * @param {BigInt} user_id
 * @param {int} game_id
 * @param {int} season_id
 * @param {int} page
 * @param {int} pageSize
 * @returns {Match[]}
 */
async function getMatchHistoryForUser(
	user_id,
	game_id,
	season_id,
	page = 1,
	pageSize = 10
) {
	try {
		return await Match.findAll({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				season_id: season_id,
			},
			include: [
				{
					model: MatchPlayer,
					attributes: ["match_id"],
					required: true,
					where: { user_id: user_id },
				},
			],
			order: [["end_time", "DESC"]],
			limit: pageSize,
			offset: (page - 1) * pageSize,
		});
	} catch (err) {
		console.log(err);
		return null;
	}
}

/**
 *
 * @param {int} game_id
 * @param {int} season_id
 * @param {int} page
 * @param {int} pageSize
 * @returns {Match[]}
 */
async function getMatchHistoryForServer(
	game_id,
	season_id,
	page = 1,
	pageSize = 10
) {
	try {
		return await Match.findAll({
			where: {
				end_time: { [Op.ne]: null },
				game_id: game_id,
				season_id: season_id,
			},
			order: [["end_time", "DESC"]],
			limit: pageSize,
			offset: (page - 1) * pageSize,
		});
	} catch {
		return null;
	}
}

/**
 *
 * @param {Match[]} match_ids
 * @returns {String[]}
 */
async function getHostsForMatches(match_ids) {
	try {
		const matchesWithLobbiesAndHosts = await Match.findAll({
			where: {
				match_id: {
					[Op.in]: match_ids,
				},
			},
			include: [
				{
					model: Lobby,
					as: "Lobby",
					attributes: ["lobby_id", "host_id"],
					include: [
						{
							model: User,
							as: "Host",
							attributes: ["user_id"],
						},
					],
				},
			],
			order: [["match_id", "DESC"]],
		});
		const userIds = [];
		for (var match of matchesWithLobbiesAndHosts) {
			userIds.push(match.Lobby.Host.user_id);
		}
		const hostPromises = userIds.map(async (user) => {
			try {
				const discordUser = await client.users.cache.get(`${user}`);
				if (discordUser) return `<@${user}>`;
				return user.summoner_name;
			} catch (e) {
				console.log(e);
				return user.summoner_name;
			}
		});
		const hosts = await Promise.all(hostPromises);
		return hosts;
	} catch (e) {
		console.log(e);
		return null;
	}
}

/**
 * @param {int[]} match_ids
 * @param {BigInt} user_id
 * @returns {Promise<MatchPlayer[]>}
 */
async function getMatchPlayersForMatchesAndUser(match_ids, user_id) {
	const matchesWithPlayers = await Match.findAll({
		where: {
			match_id: {
				[Op.in]: match_ids,
			},
		},
		include: [
			{
				model: MatchPlayer,
				required: true, // <- Important: Ensures the join behaves like an INNER JOIN
				where: { user_id: user_id },
			},
		],
		order: [["match_id", "DESC"]],
	});
	return matchesWithPlayers;
}

module.exports = {
	getTotalMatchesForUser,
	getTotalMatchesForServer,
	getMatchHistoryForUser,
	getMatchHistoryForServer,
	getHostsForMatches,
	getMatchPlayersForMatchesAndUser,
};
