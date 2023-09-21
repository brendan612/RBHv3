const { DataTypes, Model, UniqueConstraintError } = require("sequelize");
const { baseEmbed } = require("../components/embed.js");
const {
	LeagueTier,
	LeagueRank,
} = require("../components/leagueRankedEnums.js");
const { Client, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
	getSummonerByName,
	getRankBySummonerId,
} = require("../api/riot/riotApiHandler.js");

module.exports = (sequelize) => {
	class User extends Model {
		/**
		 *
		 * @param {bigint} user_id
		 * @returns {User}
		 */
		static async createUser(user_id, join_date = new Date()) {
			try {
				return await User.create({
					user_id: user_id,
					join_date: join_date,
				});
			} catch (e) {
				if (e instanceof UniqueConstraintError) {
					console.log("User already exists");
					return this.getUser(user_id);
				}
			}
		}
		/**
		 *
		 * @param {bigint} user_id
		 * @returns
		 */
		static async getUser(user_id) {
			return await User.findOne({
				where: { user_id: BigInt(user_id) },
			});
		}

		/**
		 * @param {bigint} summoner_name
		 * @returns {User}
		 */
		static async getUserBySummonerName(summoner_name) {
			return await User.findOne({ where: { summoner_name: summoner_name } });
		}

		/**
		 *
		 * @param {string} summoner_name_to_verify
		 * @returns { {embed: MessageEmbed, verifyButton: MessageButton} }
		 */
		generateVerifyEmbed = async (summoner_name_to_verify) => {
			const embed = baseEmbed("Verify", "Verify your account.");

			embed.addFields({
				name: "Steps to Verify",
				value:
					"1. Change your summoner icon to the one shown to the right.\n2. Click the verify button below.",
				inline: false,
			});
			embed.addFields({
				name: `Account Requirements`,
				value:
					"\u2022 Account must be level 50.\n\u2022 Account must be at least Gold 4",
				inline: false,
			});

			let verifyIcon = 0;
			await getSummonerByName(summoner_name_to_verify).then((summoner) => {
				let icon = summoner.profileIconId;
				while (icon === summoner.profileIconId) {
					icon = Math.floor(Math.random() * 29);
				}
				verifyIcon = icon;
			});
			//random between 0 and 28 inclusively

			embed.setThumbnail(
				`http://ddragon.leagueoflegends.com/cdn/13.18.1/img/profileicon/${verifyIcon}.png`
			);

			const verifyButton = new ButtonBuilder()
				.setCustomId(
					`verify_${this.user_id}_${summoner_name_to_verify}_${verifyIcon}`
				)
				.setLabel("Verify")
				.setStyle(ButtonStyle.Primary);

			return { embed, verifyButton };
		};

		handleVerifyButton = async (interaction) => {
			const customId = interaction.customId;
			const customIdParts = customId.split("_");
			const button_user_id = customIdParts[1];
			const summoner_name = customIdParts[2];
			const icon = customIdParts[3];

			if (BigInt(button_user_id) !== BigInt(this.user_id)) {
				return await interaction.followUp({
					content: "This is not your verification button.",
					ephemeral: true,
				});
			}

			let correctIcon = false;
			let validAccountLevel = false;
			let validRank = false;

			let summoner_id = null;
			await getSummonerByName(summoner_name).then((summoner) => {
				const currentIcon = summoner.profileIconId;
				summoner_id = summoner.id;
				correctIcon = currentIcon === icon;

				const accountLevel = summoner.summonerLevel;
				validAccountLevel = accountLevel >= 50;
			});

			await getRankBySummonerId(summoner_id).then((summoner) => {
				const tier = summoner.tier;
				const rank = summoner.rank;
				validRank = ![
					LeagueTier.UNRANKED,
					LeagueTier.IRON,
					LeagueTier.BRONZE,
					LeagueTier.SILVER,
				].includes(tier);
			});

			if (!correctIcon) {
				return await interaction.followUp({
					content: "Incorrect Summoner Icon",
					ephemeral: true,
				});
			} else {
				this.summoner_name = summoner_name;
				await this.save();

				return await interaction.followUp({
					content: "You have successfully verified your account.",
					ephemeral: true,
				});
			}
		};
	}
	User.init(
		{
			user_id: {
				type: DataTypes.BIGINT,
				allowNull: false,
				primaryKey: true,
				unique: true,
			},
			summoner_name: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: true,
				validate: {
					len: [0, 16],
				},
			},
			verified: {
				type: DataTypes.BOOLEAN,
			},
			server_experience: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			server_level: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			server_money: {
				type: DataTypes.BIGINT,
				allowNull: true,
				defaultValue: 0,
			},
			elo_rating: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 1600,
			},
			join_date: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			last_daily_date: {
				type: DataTypes.DATE,
				allowNull: true,
				defaultValue: null,
			},
			vote_streak: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			last_vote_date: {
				type: DataTypes.DATE,
				allowNull: true,
				defaultValue: null,
			},
		},
		{
			sequelize,
			modelName: "User",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return User;
};
