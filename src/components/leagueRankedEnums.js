const LeagueTier = {
	UNRANKED: "UNRANKED",
	IRON: "IRON",
	BRONZE: "BRONZE",
	SILVER: "SILVER",
	GOLD: "GOLD",
	PLATINUM: "PLATINUM",
	EMERALD: "EMERALD",
	DIAMOND: "DIAMOND",
	MASTER: "MASTER",
	GRANDMASTER: "GRANDMASTER",
	CHALLENGER: "CHALLENGER",
};

const LeagueTierHierarchy = [
	LeagueTier.UNRANKED,
	LeagueTier.IRON,
	LeagueTier.BRONZE,
	LeagueTier.SILVER,
	LeagueTier.GOLD,
	LeagueTier.PLATINUM,
	LeagueTier.EMERALD,
	LeagueTier.DIAMOND,
	LeagueTier.MASTER,
	LeagueTier.GRANDMASTER,
	LeagueTier.CHALLENGER,
];

const LeagueRank = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
};

module.exports = {
	LeagueTier,
	LeagueTierHierarchy,
	LeagueRank,
};
