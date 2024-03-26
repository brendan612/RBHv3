const axios = require("axios");
require("dotenv").config();

const REGIONS = {
	NA: "americas",
	EUW: "europe",
};

const SUB_REGIONS = {
	americas: "na1",
	europe: "euw1",
};

/**
 *
 * @param {UserDTO} user
 */
async function getSummoner(user) {
	if (user.puuid) {
		return await getSummonerByPuuid(user.puuid);
	} else {
		return await getSummonerByRiotID(
			user.summoner_name,
			user.tag_line,
			user.region_id
		);
	}
}

async function getSummonerByRiotID(gameName, tagLine, region = "NA") {
	const { User } = require("../../models");
	const user = await User.findOne({
		where: {
			summoner_name: gameName,
			tag_line: tagLine,
			region_id: region,
		},
	});

	if (user?.puuid) {
		return await getSummonerByPuuid(user.puuid, region);
	}

	const apiRegion = REGIONS[region];

	const riotAccount = await axios.get(
		//prettier-ignore
		`https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return await getSummonerByPuuid(riotAccount.data.puuid, region);
}

async function getSummonerByPuuid(puuid, region = "NA") {
	const apiRegion = SUB_REGIONS[REGIONS[region]];
	const summoner = await axios.get(
		`https://${apiRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return summoner.data;
}

async function getRankByRiotID(gameName, tagLine, region = "NA") {
	const apiRegion = SUB_REGIONS[REGIONS[region]];
	const summoner = await getSummonerByRiotID(gameName, tagLine, region);

	const rank = await axios.get(
		`https://${apiRegion}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return rank.data;
}

async function getRiotAccountByPuuid(puuid, region = "NA") {
	const apiRegion = REGIONS[region];
	const riotAccount = await axios.get(
		`https://${apiRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return riotAccount.data;
}

module.exports = {
	getSummoner,
	getSummonerByRiotID,
	getSummonerByPuuid,
	getRankByRiotID,
	getRiotAccountByPuuid,
};
