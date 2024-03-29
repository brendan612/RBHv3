const axios = require("axios");
const { Champion } = require("../../models");

const fs = require("fs").promises;
const configPath = require("path").resolve(
	__dirname,
	`../../../${process.env.CONFIG_FILE}`
);

const client = require("../../client.js");

class ChampionService {
	constructor() {
		this.current_league_patch = "";
	}

	async getLatestPatch() {
		const url = "https://ddragon.leagueoflegends.com/api/versions.json";
		try {
			const response = await axios.get(url);
			this.current_league_patch = response.data[0];
			await this.updateConfigToLatestPatch(this.current_league_patch);
			return this.current_league_patch; //return latest patch
		} catch (error) {
			console.error("Error fetching patch data:", error);
		}
	}

	async updateConfigToLatestPatch(patch) {
		const configData = await fs.readFile(configPath, "utf8");
		const config = JSON.parse(configData);
		console.log(config.current_league_patch, patch);
		config.current_league_patch = patch;
		await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
	}

	async getChampionData(patch) {
		const url = `http://ddragon.leagueoflegends.com/cdn/${patch}/data/en_US/champion.json`;
		try {
			const response = await axios.get(url);
			return response.data.data;
		} catch (error) {
			console.error("Error fetching champion data:", error);
		}
	}

	async updateChampionData(championData) {
		const champions = Object.values(championData);

		for (let champion of champions) {
			const championExists = await Champion.findOne({
				where: { champion_id: champion.key },
			});

			if (championExists) {
				await Champion.update(
					{
						name: champion.name,
						square_icon: `https://ddragon.leagueoflegends.com/cdn/${this.current_league_patch}/img/champion/${champion.id}.png`,
						loading_splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champion.id}_0.jpg`,
						full_splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,
					},
					{
						where: { champion_id: champion.key },
					}
				);
			} else {
				await Champion.create({
					champion_id: champion.key,
					name: champion.name,
					square_icon: `https://ddragon.leagueoflegends.com/cdn/${this.current_league_patch}/img/champion/${champion.id}.png`,
					loading_splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champion.id}_0.jpg`,
					full_splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,
				});
			}
		}
	}

	async cacheAutocompleteChampionData() {
		const champions = await Champion.findAll({
			order: [["name", "ASC"]],
		});

		for (let champion of champions) {
			client.cache.set(
				champion.name.replace("'", ""),
				champion.champion_id.toString(),
				"autoCompleteChampionData"
			);
		}
	}
}

module.exports = ChampionService;
