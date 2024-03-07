const client = require("../../client.js");
const level_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.level_roles;
const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

const { User } = require("../../models");

//prettier-ignore
const cardNumbers = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
//prettier-ignore
const suitNames = ["spades", "clubs", "diamonds", "hearts", "bandersnatch", "dodo", "jabberwock"];

class UserLevelManager {
	constructor() {
		this.exp_gain = 35;
		this.exp_timeout = 6 * 60 * 1000; //6 minutes
	}

	/**
	 *
	 * @param {number} level
	 * @returns {number}
	 */
	expForNextLevel(level) {
		level = level < 1 ? 1 : level;
		return Math.floor(500 * Math.pow(level + 1, 0.425));
	}

	expToNextLevel(level, totalExp) {
		return this.expForNextLevel(level) - totalExp;
	}

	async updateUserExperience(user_id) {
		const user = await User.findByPk(user_id);
		const currentTimestamp = Date.now();
		const lastMessageTimestamp = user.last_message_date || 0;

		const allowExperience =
			currentTimestamp - lastMessageTimestamp > this.exp_timeout;

		if (allowExperience) {
			const { level, remainingExp } = this.calculateLevelAndRemainingExp(
				user.server_experience
			);

			user.server_experience += this.exp_gain;
			user.last_message_date = currentTimestamp;
			await user.save();

			if (remainingExp + this.exp_gain >= this.expForNextLevel(level)) {
				await this.assignLevelRole(user_id, level + 1, true);
			}
		}
	}

	//remainingExp is the amount of exp into the current level
	calculateLevelAndRemainingExp(totalExp) {
		let level = 1;
		let xpForLevelUp = this.expForNextLevel(level);
		let remainingExp = totalExp;

		while (remainingExp >= xpForLevelUp) {
			remainingExp -= xpForLevelUp;
			level += 1;
			xpForLevelUp = this.expForNextLevel(level);
		}

		return { level, remainingExp };
	}

	calculateLevelReward(level) {
		//limit the max reward to 10 million
		return Math.min(1500 * 1.1 ** level, 10000000);
	}

	calculateMatchReward(level, isWin) {
		if (isWin) {
			return 50000 * 1.1 ** level;
		} else {
			return 25000 * 1.1 ** level;
		}
	}

	/**
	 *
	 * @param {number} level
	 * @returns
	 */
	getSuitNumberNameAndCardNumber(level) {
		const suitNumber = Math.min(Math.floor(Math.max(level - 2, 0) / 13), 6);
		const suitName = suitNames[suitNumber];
		const cardNumber = cardNumbers[Math.max(level - 2, 0) % 13];

		return { suitNumber, suitName, cardNumber };
	}

	getRoleTitleForProfile(level, user_id = "") {
		//prettier-ignore

		if (user_id) {
			const guild = client.guilds.cache.get(client.guildID);
			const member = guild.members.cache.get(user_id);
			const owner = hasRequiredRoleOrHigher(member, "owner");

			if (owner) {
				return "Queen of Hearts";
			}
		}

		const { suitNumber, suitName, cardNumber } =
			this.getSuitNumberNameAndCardNumber(level);

		let title = "";
		switch (suitNumber) {
			case 4:
				title = `The Bandersnatch`;
				break;
			case 5:
				title = `The Jubjub`;
				break;
			case 6:
				title = `The Jabberwock`;
				break;
			default:
				title = `${cardNumber} of ${
					suitName.charAt(0).toUpperCase() + suitName.slice(1)
				}`;
		}
		return title;
	}

	async assignLevelRole(user_id, level, sendMessage = false) {
		const guild = client.guilds.cache.get(client.guildID);
		const member = guild.members.cache.get(user_id);

		const { suitNumber, suitName, cardNumber } =
			this.getSuitNumberNameAndCardNumber(level);

		const roleId = level_roles[suitName];

		const role = guild.roles.cache.find((r) => r.id === roleId);

		const rolesToRemove = member.roles.cache.filter((r) =>
			Object.values(level_roles).includes(r.id)
		);

		await member.roles.remove(rolesToRemove);
		await member.roles.add(role);

		let title = "";
		switch (suitNumber) {
			case 4:
				title = `<@&${level_roles["bandersnatch"]}>`;
				break;
			case 5:
				title = `<@&${level_roles["dodo"]}>`;
				break;
			case 6:
				title = `<@&${level_roles["jabberwock"]}>`;
				break;
			default:
				title = `${cardNumber} of <@&${level_roles[suitName]}>`;
		}
		if (sendMessage) {
			const { generateLevelUpEmbed } = require("../messages/userEmbed.js");
			await generateLevelUpEmbed(
				user_id,
				level,
				this.calculateLevelReward(level),
				title
			);
		}
	}
}

module.exports = UserLevelManager;
