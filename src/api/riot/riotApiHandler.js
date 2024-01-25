const axios = require("axios");
const UserDTO = require("../../dataManager/DTOs/userDTO");

require("dotenv").config();

const REGIONS = {
	NA: "americas",
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
			REGIONS[user.region]
		);
	}
}

async function getSummonerByRiotID(gameName, tagLine, region = "NA") {
	const { User } = require("../../models");
	const user = await User.findOne({
		where: {
			summoner_name: gameName,
			tag_line: tagLine,
			region: region,
		},
	});

	if (user?.puuid) {
		return await getSummonerByPuuid(user.puuid);
	}

	const riotAccount = await axios.get(
		`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return await getSummonerByPuuid(riotAccount.data.puuid);
}

async function getSummonerByPuuid(puuid) {
	const summoner = await axios.get(
		`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
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
	const summoner = await getSummonerByRiotID(gameName, tagLine, region);
	const rank = await axios.get(
		`https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return rank.data;
}

async function getRiotAccountByPuuid(puuid) {
	const riotAccount = await axios.get(
		`https://americas.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
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
