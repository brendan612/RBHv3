const { DataTypes, Model, Op } = require("sequelize");
const misc_roles = require(`../../${process.env.CONFIG_FILE}`).roles.misc_roles;
const client = require("../client.js");

module.exports = (sequelize) => {
	class Season extends Model {
		/**
		 *
		 * @param {string} name
		 * @param {number} game_id
		 * @param {Date} start_date
		 * @param {Date} end_date
		 * @returns {Promise<Season>}
		 */
		static async createSeason(name, game_id, start_date, end_date) {
			let start = new Date();

			//get last day of the month
			let end = new Date(start);
			end.setMonth(end.getMonth() + 1);
			end.setDate(1);
			end.setDate(end.getDate() - 1);
			if (start_date) start = new Date(start_date);
			if (end_date) end = new Date(end_date);

			const utcEnd = Date.UTC(
				end.getUTCFullYear(),
				end.getUTCMonth(),
				end.getUTCDate(),
				23,
				59,
				59,
				999
			);
			const endInUTC = new Date(utcEnd);

			const season_game_id =
				(await Season.max("season_game_id", {
					where: { game_id: game_id },
				})) + 1;

			const seasonName = name ? name : `Season ${season_game_id}`;

			return await Season.create({
				name: seasonName,
				game_id: game_id,
				start_date: start,
				end_date: endInUTC,
				season_game_id: season_game_id,
			});
		}

		/**
		 *
		 * @param {number} season_id
		 * @returns {Season}
		 */
		static async getSeason(season_id) {
			return await Season.findOne({
				where: { season_id: season_id },
			});
		}

		/**
		 *
		 * @returns {Promise<Season>}
		 */
		static async getCurrentSeason(game_id = 1) {
			let season = await Season.findOne({
				where: { end_date: { [Op.gt]: new Date() }, game_id: game_id },
			});
			return season;
		}

		static async endSeason(game_id = 1, season_id) {
			const UserService = require("../dataManager/services/userService");
			const { Lobby } = require("./index.js");
			const {
				getVeteransForSeason,
			} = require("../dataManager/queries/stats/stats");
			const {
				getLeaderboard,
			} = require("../dataManager/queries/stats/leaderboard");

			let season = await Season.findOne({
				where: { season_id: season_id, game_id: game_id },
			});
			if (season) {
				const now = new Date();
				if (season.end_date > now) {
					season.end_date = now;
					await season.save();
				}

				const qc_veteran_role = client.guild.roles.cache.find(
					(role) => role.name === misc_roles.qc_veteran
				);

				const qc_top_veteran_role = client.guild.roles.cache.find(
					(role) => role.name === misc_roles.qc_top_veteran
				);

				const qc_top_3_role = client.guild.roles.cache.find(
					(role) => role.name === misc_roles.qc_top_3
				);

				const qc_champion_role = client.guild.roles.cache.find(
					(role) => role.name === misc_roles.qc_champion
				);

				try {
					const veterans = await getVeteransForSeason(game_id, season_id, "NA");

					const topVeteran = veterans[0];
					const otherVeterans = veterans.slice(1);
					const topVeteranUser = await client.guild.members.fetch(
						topVeteran.user_id
					);
					topVeteranUser.roles.add(qc_top_veteran_role);
					const topVeteranService = await UserService.createUserService(
						topVeteran.user_id
					);
					await topVeteranService.addMoney(
						10000 * topVeteran.dataValues.total_matches
					); //top veteran

					otherVeterans.forEach(async (veteran) => {
						const user = await client.guild.members.fetch(veteran.user_id);
						user.roles.add(qc_veteran_role);
						const userService = await UserService.createUserService(
							veteran.user_id
						);
						await userService.addMoney(1000 * veteran.dataValues.total_matches); //veteran
					});

					const leaderboard = await getLeaderboard(
						game_id,
						season_id,
						"NA",
						3,
						false
					);

					const champion = leaderboard[0];
					const top3 = leaderboard.slice(1, 2);

					top3.forEach(async (top) => {
						const user = await client.guild.members.fetch(top.user_id);
						user.roles.add(qc_top_3_role);
						const userService = await UserService.createUserService(
							top.user_id
						);
						if (top.user_id === leaderboard[1].user_id) {
							userService.addMoney(2500000); //second place
						}

						if (top.user_id === leaderboard[2].user_id) {
							userService.addMoney(1250000); //third place
						}
					});

					const championUser = await client.guild.members.fetch(
						champion.user_id
					);
					championUser.roles.add(qc_champion_role);
					const userService = await UserService.createUserService(
						champion.user_id
					);
					await userService.addMoney(5000000); //first place

					const whereClause = {
						game_id: game_id,
						closed_date: {
							[Op.ne]: null,
						},
					};

					if (season) {
						whereClause.season_id = season.season_id;
					}

					const lobbies = await Lobby.findAll({
						where: whereClause,
					});

					const hostStats = new Map();

					lobbies.forEach((lobby) => {
						const host = lobby.host_id;
						if (hostStats.has(host)) {
							hostStats.set(host, hostStats.get(host) + 1);
						} else {
							hostStats.set(host, 1);
						}
					});

					hostStats.forEach(async (lobbies, host) => {
						const user = await UserService.createUserService(host);
						await user.addMoney(lobbies * 10000);
					});
				} catch {
					console.log("error");
				}
			}
		}
	}
	Season.init(
		{
			season_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			season_game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			game_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			start_date: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			end_date: {
				type: DataTypes.DATE,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Season",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return Season;
};
