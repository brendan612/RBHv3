const c = require("config");
const client = require("../../client.js");
const level_roles = require("../../../config.json").roles.level_roles;
const { generateLevelUpEmbed } = require("../messages/userEmbed.js");

//prettier-ignore
const cardNumbers = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
//prettier-ignore
const suitNames = ["spades", "clubs", "diamonds", "hearts", "bandersnatch", "dodo", "jabberwock"];

class UserLevelManager {
	constructor() {}

	expToNextLevel(level) {
		level = level < 1 ? 1 : level;
		return Math.floor(500 * Math.pow(level + 1, 0.425));
	}

	calculateLevelAndRemainingExp(totalExp) {
		let level = 1;
		let xpForLevelUp = this.expToNextLevel(level);
		let remainingExp = totalExp;

		while (remainingExp >= xpForLevelUp) {
			remainingExp -= xpForLevelUp;
			level += 1;
			xpForLevelUp = this.expToNextLevel(level);
		}

		return { level, remainingExp };
	}

	calculateLevelReward(level) {
		return 1500 * 1.1 ** level;
	}

	getRoleTitleForProfile(level) {
		//prettier-ignore

		const suitNumber = Math.min(Math.floor((Math.max(level - 2, 0)) / 13), 6);
		const cardNumber = cardNumbers[Math.max(level - 2, 0) % 13];
		const suitName = suitNames[suitNumber];

		console.log(level, suitNumber, cardNumber, suitName);
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

		const suitNumber = Math.max(Math.min(Math.floor((level - 2) / 13), 6), 0);
		const cardNumber = cardNumbers[(level - 2) % 13];
		const suitName = suitNames[suitNumber];

		const roleId = level_roles[suitName];

		const role = guild.roles.cache.find((r) => r.id === roleId);
		const rolesToRemove = Object.values(level_roles)
			.map((roleId) => {
				const role = guild.roles.cache.find((r) => r.id === roleId);
				if (!role) {
					console.error(`Role not found for ID: ${roleId}`);
				}
				return role;
			})
			.filter((role) => role); // This will remove undefined roles

		console.log(rolesToRemove);
		console.log(role);
		try {
			await member.roles.add(role);
			await member.roles.remove(
				rolesToRemove.filter((r) => r && r.id !== role.id)
			);
		} catch (err) {
			console.log(err);
		}

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
