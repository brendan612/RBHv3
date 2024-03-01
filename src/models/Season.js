const { DataTypes, Model, Op } = require("sequelize");
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
			let season = await Season.findOne({
				where: { season_id: season_id, game_id: game_id },
			});
			if (season) {
				const now = new Date();
				if (season.end_date > now) {
					season.end_date = now;
					await season.save();
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
