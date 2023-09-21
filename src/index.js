const { Client, Events, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const { join } = require("node:path");
const { sequelize, User, Lobby, Game, Season } = require("./models");
const { register } = require("module");
const { generateTournamentCode } = require("./api/riot/riotApiHandler.js");

require("dotenv").config();

const token = process.env.token;
const clientID = process.env.clientID;
const guildID = process.env.guildID;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});
client.guildID = guildID;

const loadFiles = (folderName, registerCallback, checkProperties) => {
	const foldersPath = join(__dirname, folderName);
	const folders = fs.readdirSync(foldersPath);

	for (const folder of folders) {
		const filesPath = join(foldersPath, folder);
		const stats = fs.statSync(filesPath);

		if (stats.isDirectory()) {
			const files = fs
				.readdirSync(filesPath)
				.filter((file) => file.endsWith(".js") && !file.startsWith("index"));

			for (const file of files) {
				const filePath = join(filesPath, file);
				const item = require(filePath);

				if (checkProperties(item)) {
					registerCallback(item);
				} else {
					console.log(
						`[WARNING] The file at ${filePath} is missing required properties.`
					);
				}
			}
		} else {
			const item = require(filesPath);

			if (checkProperties(item)) {
				registerCallback(item);
			} else {
				console.log(
					`[WARNING] The file at ${filesPath} is missing required properties.`
				);
			}
		}
	}
};

const loadCommands = () => {
	client.commands = new Collection();

	loadFiles(
		"commands",
		(command) => client.commands.set(command.data.name, command),
		(command) => "data" in command && "execute" in command
	);
};

const loadEvents = () => {
	loadFiles(
		"events",
		(event) => {
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		},
		(event) => "name" in event && "execute" in event
	);
};

const loadDatabaseConnection = async () => {
	await sequelize.sync().then(async () => {
		console.log("Database synced");
		client.db = sequelize;
		// const game = await Game.createGame("League of Legends");
		// const game2 = await Game.createGame("Valorant");
		// const game3 = await Game.createGame("Teamfight Tactics");
		// const season = await Season.createSeason("Season 1", game.game_id);
		// await User.createUser(105858401497546752, new Date()).then(async (me) => {
		// 	me.summoner_name = "Simuna";
		// 	await me.save();
		// });

		// for (let i = 0; i < 13; i++) {
		// 	const dummy = await User.createUser(i + 1, new Date());
		// 	dummy.summoner_name = "Dummy " + (i + 1);
		// 	await dummy.save();
		// }
		loadCommands();
		loadEvents();
	});
};
loadDatabaseConnection();

client.login(token);
