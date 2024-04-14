const { Interaction, Guild, GuildMember } = require("discord.js");

/**
 *
 * @param {Guild} guild
 * @param {GuildMember} member
 * @returns {number}
 */
const calculateDailyBoostMoney = (guild, member) => {
    let baseAwardMoney = member.premiumSinceTimestamp ? 100000 : 2000;

    if (member.premiumSinceTimestamp) {
        const boostCount = guild.premiumSubscriptionCount;

        let boostAmount = 50000;
        const thresholds = [2, 7, 14, 20];

        thresholds.forEach((threshold) => {
            if (boostCount >= threshold) boostAmount += 50000;
        });

        if (boostCount > thresholds[thresholds.length - 1]) {
            const extraBoosts = boostCount - thresholds[thresholds.length - 1];
            const extraIncrements = Math.floor(extraBoosts / 5);
            boostAmount += extraIncrements * 50000;
        }
        baseAwardMoney += boostAmount;
    }

    return baseAwardMoney;
};

module.exports = { calculateDailyBoostMoney };
