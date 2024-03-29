const {
	User,
	UserEloRating,
	Referral,
	ModerationLog,
	sequelize,
} = require("../../models/index.js");
const UserDTO = require("../DTOs/userDTO.js");
const {
	generateVerifyEmbed,
	generateProfileEmbed,
} = require("../messages/userEmbed.js");
const {
	GuildMember,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	Interaction,
} = require("discord.js");
const {
	getSummonerByRiotID,
	getRankByRiotID,
	getRiotAccountByPuuid,
} = require("../../api/riot/riotApiHandler.js");
const {
	LeagueTier,
	LeagueTierHierarchy,
} = require("../../components/leagueRankedEnums.js");
const client = require("../../client.js");
const UserLevelManager = require("../managers/userLevelManager.js");
const roles = require(`../../../${process.env.CONFIG_FILE}`).roles.game_roles[
	"League of Legends"
];
const { Op, Sequelize } = require("sequelize");
const { ActionType } = require("../../components/moderationActionTypeEnum.js");
const {
	displayDateAsTimestamp,
	TimestampFormat,
} = require("../../utilities/timestamp.js");
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");
const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const donor_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.donor_roles;

class UserService {
	/**
	 *
	 * @param {User} user
	 */
	constructor(user) {
		this.user = user;
		this.user_id = user.user_id;
	}

	static async createUserService(user_id) {
		let user = await User.findByPk(user_id);
		if (!user) {
			const member = await client.guild.members.fetch(user_id);
			user = await UserService.createUser(user_id, member.joinedAt);
		}
		return new UserService(user);
	}
	/**
	 *
	 * @param {bigint} user_id
	 * @param {Date} join_date
	 * @param {string} region
	 * @returns {Promise<User>}
	 */
	static async createUser(user_id, join_date, region = "NA") {
		const user = await User.findOrCreate({
			where: {
				user_id: user_id,
			},
			defaults: {
				user_id: user_id,
				join_date: join_date,
				region_id: region,
			},
		});

		return user[0];
	}

	/**
	 * @param {bigint} user_id
	 * @returns {Promise<UserDTO>}
	 */
	static async getUser(user_id) {
		const user = await User.findByPk(user_id);
		return new UserDTO(user);
	}

	async verifyUser(user_id, game_name, tag_line, puuid, referrer_id) {
		const user = await User.findByPk(user_id);
		const guild = await client.guilds.fetch(client.guildID);
		user.summoner_name = game_name;
		user.tag_line = tag_line;
		user.puuid = puuid;
		user.verified = true;
		if (referrer_id && referrer_id !== user_id) {
			const referral = await Referral.create({
				user_id: user_id,
				referrer_id: referrer_id,
			});
			user.addReferral(referral);
		}
		await user.save();
		try {
			await this.updateMemberNickname(user_id, "Verifying Account");
			await guild.members.fetch(user_id).then(async (member) => {
				await member.roles.add(permission_roles.verified);
				await member.roles.add(permission_roles.guest);
				await member.roles.remove(permission_roles.unverified);
			});
		} catch (e) {
			console.error("Not enough permissions to change nickname.");
		}

		return new UserDTO(user);
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @param {string} game_name
	 * @param {string} tag_line
	 * @param {string} puuid optional
	 * @returns
	 */
	async updateUserRiotAccount(user_id, game_name, tag_line, puuid = "") {
		const user = await User.findByPk(user_id);
		user.summoner_name = game_name;
		user.tag_line = tag_line;
		user.puuid = puuid ? puuid : user.puuid;
		if (!user.puuid) {
			await getSummonerByRiotID(game_name, tag_line).then((summoner) => {
				user.puuid = summoner.puuid;
			});
		}
		await user.save();
		await this.updateMemberNickname(user_id, "Updating Riot Account");
		return new UserDTO(user);
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @returns {UserDTO}
	 */
	async syncUserRiotAccount(user_id) {
		const user = await User.findByPk(user_id);
		const account = await getRiotAccountByPuuid(user.puuid);
		if (!account) {
			return null;
		}
		await this.updateUserRiotAccount(
			user.user_id,
			account.gameName,
			account.tagLine,
			account.puuid
		);
		return new UserDTO(user);
	}

	async clearUserPuuid() {
		const user = await User.findByPk(this.user.user_id);
		user.puuid = null;
		await user.save();
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @param {string} reason
	 * @returns
	 */
	async updateMemberNickname(user_id, reason) {
		const user = await User.findByPk(user_id);
		if (!user.verified) {
			return;
		}
		const guild = await client.guilds.fetch(client.guildID);
		await guild.members.fetch(user.user_id.toString()).then(async (member) => {
			await member.setNickname(
				user.summoner_name + "#" + user.tag_line,
				reason
			);
			return true;
		});
	}

	/**
	 *
	 * @param {number} game_id
	 * @param {number} season_id
	 * @returns {Promise<UserEloRating>}
	 */
	async getEloRating(game_id, season_id) {
		if (season_id) {
			const elo = await UserEloRating.findOne({
				where: {
					user_id: this.user.user_id,
					game_id: game_id,
					season_id: season_id,
				},
			});
			return elo;
		} else {
			const elo = await UserEloRating.findOne({
				where: {
					user_id: this.user.user_id,
					game_id: game_id,
				},
			});
			return elo;
		}
	}

	/**
	 *
	 * @param {BigInt[]} players
	 * @param {string} winLoss win or loss
	 * @returns {Promise<number>}
	 */
	async calculateEloChange(players, winLoss) {
		return 0;
	}

	/**
	 *
	 * @param {bigint} user_id
	 * @param {string} game_name
	 * @param {string} tag_line
	 * @param {GuildMember} referrer
	 * @returns
	 */
	async generateVerifyEmbed(user_id, game_name, tag_line, referrer) {
		return await generateVerifyEmbed(user_id, game_name, tag_line, referrer);
	}

	async handleVerifyInteraction(interaction) {
		const member = interaction.member;
		const idParts = interaction.customId.split("_");
		const user_id = idParts[1];

		await interaction.deferUpdate();

		if (
			user_id !== member.id &&
			!hasRequiredRoleOrHigher(member, "developer")
		) {
			return await interaction.followUp({
				content: "This is not your verification button.",
				ephemeral: true,
			});
		}

		const game_name = idParts[2];
		const tag_line = idParts[3];
		const verify_icon = idParts[4];
		let referrer_id = null;
		try {
			referrer_id = idParts[5];
		} catch {}

		let correctIcon = false;
		let validAccountLevel = false;
		let validRank = false;

		let puuid = null;

		const user = await User.findByPk(user_id);
		await getSummonerByRiotID(game_name, tag_line, user.region_id).then(
			(summoner) => {
				const currentIcon = summoner.profileIconId;
				puuid = summoner.puuid;
				correctIcon = parseInt(currentIcon) === parseInt(verify_icon);
				const accountLevel = summoner.summonerLevel;
				validAccountLevel = accountLevel >= 50;
			}
		);

		await getRankByRiotID(game_name, tag_line, user.region_id).then(
			(summoner) => {
				console.log("USER SERVICE", summoner);
				function isValidRank(summoner) {
					return (
						LeagueTierHierarchy.indexOf(summoner.tier) >=
						LeagueTierHierarchy.indexOf(LeagueTier.GOLD)
					);
				}
				if (!summoner) return;
				if (Array.isArray(summoner)) {
					let highestIndex = LeagueTierHierarchy.indexOf(LeagueTier.UNRANKED);
					if (summoner.length > 1) {
						if (isValidRank(summoner[0])) {
							console.log("USER SERVICE", "VALID RANK", summoner[0]);
							highestIndex = LeagueTierHierarchy.indexOf(summoner[0].tier);
						}
						if (isValidRank(summoner[1])) {
							console.log("USER SERVICE", "VALID RANK", summoner[1]);
							highestIndex = Math.max(
								highestIndex,
								LeagueTierHierarchy.indexOf(summoner[1].tier)
							);
						}
					}
					console.log(
						"USER SERVICE",
						"HIGHEST INDEX",
						highestIndex,
						game_name,
						tag_line
					);
					validRank =
						highestIndex >= LeagueTierHierarchy.indexOf(LeagueTier.GOLD);
				} else {
					validRank = isValidRank(summoner);
				}
			}
		);

		if (!correctIcon && !hasRequiredRoleOrHigher(member, "developer")) {
			return await interaction.followUp({
				content: "Incorrect Summoner Icon",
				ephemeral: true,
			});
		} else if (!validAccountLevel) {
			return await interaction.followUp({
				content: "Account level must be least 50.",
				ephemeral: true,
			});
		} else if (!validRank) {
			return await interaction.followUp({
				content: "Account must be at least Gold 4.",
				ephemeral: true,
			});
		} else {
			await this.verifyUser(user_id, game_name, tag_line, puuid, referrer_id);

			const newVerifyButton = new ButtonBuilder()
				.setCustomId("verified")
				.setStyle(ButtonStyle.Success)
				.setLabel("Verified!")
				.setDisabled(true);
			const row = new ActionRowBuilder().addComponents(newVerifyButton);
			await interaction.editReply({
				components: [row],
			});
			return await interaction.followUp({
				content: "You have successfully verified your account.",
				ephemeral: true,
			});
		}
	}

	async addExperience(experience) {
		const userLevelManager = new UserLevelManager();
		const { level } = userLevelManager.calculateLevelAndRemainingExp(
			this.user.server_experience
		);

		this.user.server_experience += experience;

		const newLevelInfo = userLevelManager.calculateLevelAndRemainingExp(
			this.user.server_experience
		);

		if (newLevelInfo.level > level) {
			const moneyReward = userLevelManager.calculateLevelReward(
				newLevelInfo.level
			);
			this.user.server_level = newLevelInfo.level;
			this.user.server_money += moneyReward;

			await userLevelManager.assignLevelRole(
				this.user.user_id,
				newLevelInfo.level,
				true
			);
		}

		await this.user.save();
	}

	/**
	 *
	 * @param {string} role
	 */
	async addRole(role) {
		try {
			const guild = await client.guilds.fetch(client.guildID);
			const member = await guild.members.fetch(this.user.user_id);
			if (member && !member.roles.cache.has(role)) {
				const roleToAdd = guild.roles.cache.find((r) => r.id === role);
				await member.roles.add(roleToAdd);
			}
		} catch {}
	}

	/**
	 *
	 * @param {string} role
	 */
	async removeRole(role) {
		try {
			const guild = await client.guilds.fetch(client.guildID);
			const member = await guild.members.fetch(this.user.user_id);
			if (member && member.roles.cache.has(role)) {
				const roleToRemove = guild.roles.cache.find((r) => r.id === role);
				await member.roles.remove(roleToRemove);
			}
		} catch {}
	}

	async addMoney(money) {
		this.user.server_money += money;
		await this.user.save();
	}

	async removeMoney(money) {
		this.user.server_money -= money;
		await this.user.save();
	}

	/**
	 *
	 * @param {boolean} winLoss
	 * @param {*} transaction
	 */
	async addMatchReward(winLoss, transaction) {
		const userLevelManager = new UserLevelManager();
		this.user.server_money += userLevelManager.calculateMatchReward(
			this.user.server_level,
			winLoss
		);
		await this.user.save({ transaction });
	}

	async setLastMessageDate(date) {
		this.user.last_message_date = date;
		await this.user.save();
	}

	async handleLeagueRoleSelectMenu(interaction, values) {
		try {
			const guild = interaction.guild;
			const member = interaction.member;
			const guildRoles = guild.roles.cache;

			// Roles to add (selected by the user)
			const selectedRoles = values.map((roleId) => guildRoles.get(roleId));

			// Roles to remove (all configurable roles that were not selected)
			const rolesToRemove = Object.values(roles)
				.filter((roleId) => !values.includes(roleId))
				.map((roleId) => guildRoles.get(roleId))
				.filter((role) => member.roles.cache.has(role.id)); // Only include roles the member currently has

			// Adding selected roles
			await Promise.all(selectedRoles.map((role) => member.roles.add(role)));

			// Removing unselected roles
			await Promise.all(rolesToRemove.map((role) => member.roles.remove(role)));

			await this.setPrimarySecondaryRoles(
				selectedRoles[0].name,
				selectedRoles[1].name
			);

			await interaction.reply({
				content: `Your roles have been updated.\nPrimary Role: <@&${selectedRoles[0].id}>\nSecondary Role: <@&${selectedRoles[1].id}>`,
				ephemeral: true,
			});
		} catch (error) {
			console.error(error);
			await interaction.reply({
				content: "There was an error while updating your roles.",
				ephemeral: true,
			});
		}
	}

	async setPrimarySecondaryRoles(primaryRole, secondaryRole) {
		this.user.primary_role = primaryRole;
		this.user.secondary_role = secondaryRole;
		await this.user.save();
	}

	static async getTopReferrersWithPagination(page, pageSize) {
		const offset = page * pageSize;
		const limit = pageSize;

		const topReferrers = await User.findAll({
			include: [
				{
					model: Referral,
					as: "Referrals", // This alias must match the alias used in the association
					attributes: [],
				},
			],
			attributes: [
				"user_id",
				[
					Sequelize.fn("COUNT", Sequelize.col("Referrals.referral_id")),
					"referralCount",
				],
			],
			group: ["user_id"],
			having: Sequelize.literal("`referralCount` > 0"), // Ensure that only users with referrals are returned
			order: [[Sequelize.literal("referralCount"), "DESC"]],
			limit: limit,
			offset: offset,
			subQuery: false,
			raw: true,
		});

		return topReferrers;
	}

	async generateProfileEmbed(interaction, user_id) {
		return await generateProfileEmbed(interaction, user_id);
	}

	async getDonorRole(user_id) {
		const guild = await client.guilds.fetch(client.guildID);
		const member = await guild.members.fetch(user_id);

		const donor = member.roles.cache.find(
			(role) => role.id === donor_roles["donor"]
		);
		const sponsor = member.roles.cache.find(
			(role) => role.id === donor_roles["sponsor"]
		);
		const subsidizer = member.roles.cache.find(
			(role) => role.id === donor_roles["subsidizer"]
		);

		if (subsidizer) return "subsidizer";
		if (sponsor) return "sponsor";
		if (donor) return "donor";

		return "";
	}

	async isBooster(user_id) {
		const guild = await client.guilds.fetch(client.guildID);
		const member = await guild.members.fetch(user_id);
		console.log(member.premiumSince);
		return member.premiumSince !== null;
	}

	/**
	 *
	 * @returns {Promise<{isBanned: boolean, remaining: number, reason: string}>}
	 */
	async isIHBanned() {
		const latestLog = await ModerationLog.findOne({
			where: {
				targeted_user_id: this.user_id,
				type: {
					[Op.in]: [ActionType.IHBAN, ActionType.IHUNBAN],
				},
				[Op.or]: [
					{ duration: { [Op.gte]: new Date() } }, // duration is greater or equal to now
					{ duration: null }, // or duration is null
				],
			},
			order: [["created_at", "DESC"]],
		});

		if (!latestLog) return { isBanned: false, remaining: 0 };

		if (latestLog.type === ActionType.IHUNBAN) {
			return { isBanned: false, remaining: 0, reason: "" };
		} else if (latestLog.type === ActionType.IHBAN) {
			const currentDate = new Date();
			if (latestLog.duration === null)
				return {
					isBanned: true,
					remaining: new Date().setFullYear(3000),
					reason: latestLog.reason,
				};
			if (latestLog.duration > currentDate) {
				return {
					isBanned: true,
					remaining: new Date(latestLog.duration),
					reason: latestLog.reason,
				};
			} else {
				return { isBanned: false, remaining: 0, reason: "" };
			}
		}

		return { isBanned: false, remaining: 0, reason: "" };
	}

	/**
	 *
	 * @param {string} moderator_id
	 * @param {Date} bannedUntil
	 * @param {string} reason
	 */
	async ihban(moderator_id, bannedUntil, reason) {
		const log = await ModerationLog.createModerationLog(
			moderator_id,
			this.user_id,
			bannedUntil,
			ActionType.IHBAN,
			reason
		);
	}

	/**
	 *
	 * @param {string} moderator_id
	 * @param {string} reason
	 */
	async ihunban(moderator_id, reason) {
		const log = await ModerationLog.createModerationLog(
			moderator_id,
			this.user_id,
			null,
			ActionType.IHUNBAN,
			reason
		);
	}

	/**
	 *
	 * @param {Interaction} interaction
	 * @returns {Promise<bool>}
	 */
	async verifyLobbyCommandPermission(interaction) {
		if (!this.user.verified) {
			await interaction.reply({
				content: "You must verify your account before using lobby commands!",
				ephemeral: true,
			});
			return false;
		}

		const { isBanned, remaining, reason } = await this.isIHBanned();
		if (isBanned) {
			await interaction.reply({
				content: `You are banned from using lobby commands.\n Expires: ${displayDateAsTimestamp(
					remaining,
					TimestampFormat.Relative
				)}\n Reason: ${reason}`,
				ephemeral: true,
			});
			return false;
		}

		return true;
	}

	/**
	 *
	 * @param {Interaction} interaction
	 * @returns {Promise<bool>}
	 */
	async verifyAdminCommandPermission(interaction) {
		//prettier-ignore
		if(interaction.member.roles.cache.some(role => role.id === permission_roles.developer)) return true;
		//prettier-ignore
		if (!hasRequiredRoleOrHigher(interaction.member, "moderator")) {
			await interaction.reply({
				content: "You do not have permission to use this command.",
				ephemeral: true,
			});
			return false;
		}

		return true;
	}
}

module.exports = UserService;
