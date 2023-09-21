const { Kayn, REGIONS } = require("kayn");
require("dotenv").config();

const kayn = Kayn(process.env.riotAPIKey)({
	region: REGIONS.NORTH_AMERICA,
	apiURLPrefix: "https://%s.api.riotgames.com",
	locale: "en_US",
	debugOptions: {
		isEnabled: true,
		showKey: false,
	},
	requestOptions: {
		shouldRetry: true,
		numberOfRetriesBeforeAbort: 3,
		delayBeforeRetry: 1000,
		burst: false,
		shouldExitOn403: false,
	},
	cacheOptions: {
		cache: null,
		timeToLives: {
			useDefault: false,
			byGroup: {},
			byMethod: {},
		},
	},
});

async function getSummonerByName(summonerName) {
	const summoner = await kayn.Summoner.by.name(summonerName);
	return summoner;
}

async function getRankBySummonerId(summonerId) {
	const summoner = await kayn.League.Entries.by.summonerID(summonerId);
	return summoner;
}

async function generateTournamentCode() {
	const provider = await kayn.Tournament.registerProviderData("NA");
	console.log(provider);
	const tournament = await kayn.Tournament.register(provider, "RBH In-Houses");
	console.log(tournament);
	const code = await kayn.Tournament.create("RBH In-Houses", {
		mapType: "SUMMONERS_RIFT",
		pickType: "TOURNAMENT_DRAFT",
		spectatorType: "ALL",
		teamSize: 5,
		metadata: "RBH In-Houses",
	});

	return code;
}

module.exports = {
	getSummonerByName,
	getRankBySummonerId,
	generateTournamentCode,
};
