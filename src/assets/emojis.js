const { emojis } = require(`../../${process.env.CONFIG_FILE}`);

const LeagueRoleEmojis = {
	Top: emojis.top,
	Jungle: emojis.jungle,
	Mid: emojis.mid,
	Bot: emojis.bot,
	Support: emojis.support,
};

const LeagueRankEmojis = {
	IRON: emojis.iron,
	BRONZE: emojis.bronze,
	SILVER: emojis.silver,
	GOLD: emojis.gold,
	PLATINUM: emojis.platinum,
	EMERALD: emojis.emerald,
	DIAMOND: emojis.diamond,
	MASTER: emojis.master,
	GRANDMASTER: emojis.grandmaster,
	CHALLENGER: emojis.challenger,
};

module.exports = { LeagueRoleEmojis, LeagueRankEmojis };
