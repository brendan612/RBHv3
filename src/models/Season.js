const { DataTypes, Model, Op } = require("sequelize");

module.exports = (sequelize) => {
	class Season extends Model {
		/**
		 *
		 * @param {string} name
		 * @param {number} game_id
		 * @param {Date} start_date
		 * @param {Date} end_date
		 * @returns {Season}
		 */
		static async createSeason(name, game_id, start_date, end_date) {
			let start = new Date();

			//get last day of the month
			let end = new Date(start);
			end.setMonth(end.getMonth() + 1);
			end.setDate(1);
			end.setDate(end.getDate() - 1);
			if (start_date) start = start_date;
			if (end_date) end = end_date;

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

			return await Season.create({
				name: name,
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
		 * @returns {Season}
		 */
		static async getCurrentSeason() {
			return await Season.findOne({
				where: { end_date: { [Op.gt]: new Date() } },
			});
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
