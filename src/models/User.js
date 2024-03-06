const { DataTypes, Model, UniqueConstraintError, Op } = require("sequelize");
const { baseEmbed } = require("../components/embed.js");
const { LeagueTier } = require("../components/leagueRankedEnums.js");
const {
	ButtonBuilder,
	ButtonStyle,
	Interaction,
	ActionRowBuilder,
	GuildMember,
	Client,
} = require("discord.js");
const {
	getSummonerByName,
	getRankBySummonerId,
} = require("../api/riot/riotApiHandler.js");
const moment = require("moment");
const { ActionType } = require("../components/moderationActionTypeEnum.js");
const ModerationLog = require("./ModerationLog.js");
const client = require("../client.js");
const permission_roles = require(`../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;

module.exports = (sequelize) => {
	class User extends Model {
		/**
		 *
		 * @param {bigint} user_id
		 * @returns {Promise<User>}
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

		displayName = () => {
			return `${this.summoner_name}#${this.tag_line}`;
		};

		guildMember = async () => {
			const guild = await client.guilds.fetch(client.guildID);
			const member = await guild.members.fetch(this.user_id);
			return member;
		};

		/**
		 *
		 * @param {JSON} vote
		 * @param {Client} client
		 */
		awardVoteMoney = async (vote, client) => {
			console.log(vote);
			const { channels } = require(`../../${process.env.CONFIG_FILE}`);
			const money = vote.type === "upvote" ? 50000 : 0;
			let moneyToAward = 0;

			if (vote.type !== "upvote") {
				const current_time = Date.now() / 1000; // Convert milliseconds to seconds

				if (this.last_vote_date === null) {
					this.last_vote_date = 0;
				}

				const lastVoteDate = moment.unix(this.last_vote_date);
				const time_since_last_vote = moment
					.unix(current_time)
					.diff(lastVoteDate, "days");

				if (time_since_last_vote >= 1) {
					this.vote_streak = 0;
				}

				this.last_vote_date = current_time;

				moneyToAward = money + 2500 * this.vote_streak;
				this.server_money += moneyToAward;
				this.vote_streak += 1;
				this.save();
			}

			const embed = baseEmbed(
				"Thanks for voting for RBH!",
				`<@${this.user_id}> has been awarded ${moneyToAward} :pound: for voting on top.gg!`,
				true,
				"Vote Rewards"
			);

			if (this.vote_streak >= 2) {
				embed.addFields({
					name: "Streak",
					value: `You are on a ${Math.floor(
						this.vote_streak / 2
					)} day voting streak!`,
					inline: false,
				});
			}

			const actionRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel("Vote")
					.setURL(`https://top.gg/servers/${vote.guild}/vote`)
					.setStyle(ButtonStyle.Link)
			);
			await client.guilds.cache
				.get(vote.guild)
				.channels.cache.get(channels.vote_bump)
				.send({ embeds: [embed], components: [actionRow] });
		};

		/**
		 *
		 * @param {BigInt} moderator_id
		 * @param {Date} bannedUntil
		 * @param {String} reason
		 */
		ihban = async (moderator_id, bannedUntil, reason) => {
			const { ModerationLog } = require("../models");
			const log = await ModerationLog.createModerationLog(
				moderator_id,
				this.user_id,
				bannedUntil,
				ActionType.IHBAN,
				reason
			);
		};

		/**
		 *
		 * @param {BigInt} moderator_id
		 * @param {String} reason
		 */
		ihunban = async (moderator_id, reason) => {
			const { ModerationLog } = require("../models");
			const log = await ModerationLog.createModerationLog(
				moderator_id,
				this.user_id,
				null,
				ActionType.IHUNBAN,
				reason
			);
		};

		mute = async (moderator_id, duration, reason) => {
			const { ModerationLog } = require("../models");
			const log = await ModerationLog.createModerationLog(
				moderator_id,
				this.user_id,
				duration,
				ActionType.MUTE,
				reason
			);

			const member = await client.guilds.cache
				.get(client.guildID)
				.members.fetch(this.user_id);

			if (member) {
				member.roles.add(permission_roles.muted);
			}
		};

		unmute = async (moderator_id, reason) => {
			const { ModerationLog } = require("../models");
			const log = await ModerationLog.createModerationLog(
				moderator_id,
				this.user_id,
				null,
				ActionType.UNMUTE,
				reason
			);

			const member = await client.guilds.cache
				.get(client.guildID)
				.members.fetch(this.user_id);

			if (member) {
				member.roles.remove(permission_roles.muted);
			}
		};

		/**
		 *
		 * @returns {ModerationLog[]} ModerationLogs
		 */
		activeModerationActions = async () => {
			const { ModerationLog } = require("../models");
			const logs = await ModerationLog.findAll({
				where: {
					user_id: this.user_id,
					duration: {
						[Op.gt]: new Date(),
					},
				},
			});
			return logs;
		};

		/**
		 *
		 * @returns {boolean} isBanned
		 */
		isIHBanned = async () => {
			const { ModerationLog } = require("../models");
			const latestLog = await ModerationLog.findOne({
				where: {
					targeted_user_id: this.user_id,
					type: {
						[Op.in]: [ActionType.IHBAN, ActionType.IHUNBAN],
					},
				},
				order: [["created_at", "DESC"]],
			});

			if (!latestLog) return false;
			if (latestLog.type === ActionType.IHUNBAN) {
				return false;
			} else if (latestLog.type === ActionType.IHBAN) {
				const currentDate = new Date();
				if (latestLog.duration !== null && latestLog.duration > currentDate) {
					return true;
				} else {
					return false;
				}
			}

			return false;
		};

		isMuted = async () => {
			const { ModerationLog } = require("../models");
			const latestLog = await ModerationLog.findOne({
				where: {
					targeted_user_id: this.user_id,
					type: {
						[Op.in]: [ActionType.MUTE, ActionType.UNMUTE],
					},
				},
				order: [["created_at", "DESC"]],
			});

			if (!latestLog) return false;
			if (latestLog.type === ActionType.UNMUTE) {
				return false;
			} else if (latestLog.type === ActionType.MUTE) {
				const currentDate = new Date();
				if (latestLog.duration !== null && latestLog.duration > currentDate) {
					return true;
				} else {
					return false;
				}
			}

			return false;
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
				//unique: true,
				validate: {
					len: [3, 16],
				},
			},
			tag_line: {
				type: DataTypes.STRING,
				allowNull: true,
				validate: {
					len: [3, 5],
				},
			},
			verified: {
				type: DataTypes.BOOLEAN,
			},
			puuid: {
				type: DataTypes.STRING,
				allowNull: true,
				comment:
					"PUUID for league of legends - Populated on verify via Riot API",
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
			last_message_date: {
				type: DataTypes.DATE,
				allowNull: true,
				defaultValue: null,
			},
			region: {
				type: DataTypes.STRING,
				allowNull: true,
				defaultValue: "NA",
			},
			primary_role: {
				type: DataTypes.STRING,
				allowNull: true,
				defaultValue: "Fill",
				comment: "Primary role for league of legends",
			},
			secondary_role: {
				type: DataTypes.STRING,
				allowNull: true,
				defaultValue: "Fill",
				comment: "Secondary role for league of legends",
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
