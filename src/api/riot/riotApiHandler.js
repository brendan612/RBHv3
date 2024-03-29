const axios = require("axios");
require("dotenv").config();

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

async function getSummonerByRiotID(gameName, tagLine, region_id = "NA") {
	const { User, Region } = require("../../models");
	const region = await Region.findByPk(region_id);
	const user = await User.findOne({
		where: {
			summoner_name: gameName,
			tag_line: tagLine,
			region_id: region_id,
		},
	});

	if (user?.puuid) {
		return await getSummonerByPuuid(user.puuid, region_id);
	}

	const riotAccount = await axios.get(
		//prettier-ignore
		`https://${region.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return await getSummonerByPuuid(riotAccount.data.puuid, region_id);
}

async function getSummonerByPuuid(puuid, region_id = "NA") {
	const { Region } = require("../../models");

	const region = await Region.findByPk(region_id);

	const summoner = await axios.get(
		`https://${region.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);

	return summoner.data;
}

async function getRankByRiotID(gameName, tagLine, region_id = "NA") {
	const { Region } = require("../../models");

	const region = await Region.findByPk(region_id);
	const summoner = await getSummonerByRiotID(gameName, tagLine, region_id);

	const rank = await axios.get(
		`https://${region.platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
		{
			headers: {
				"X-Riot-Token": process.env.RIOTAPIKEY,
				Origin: "https://developer.riotgames.com",
			},
		}
	);
	return rank.data;
}

async function getRiotAccountByPuuid(puuid, region_id = "NA") {
	const { Region } = require("../../models");

	const region = await Region.findByPk(region_id);
	const riotAccount = await axios.get(
		`https://${region.region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`,
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
