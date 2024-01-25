const { Client, Events, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const { join } = require("node:path");
const { sequelize, User, Lobby, Game, Season } = require("./models");
const { register } = require("module");
const { generateTournamentCode } = require("./api/riot/riotApiHandler.js");
const client = require("./client.js");

const playerDraftManagerFactory = require("../src/dataManager/managers/factories/playerDraftManagerFactory.js");
const draftManagerFactory = require("../src/dataManager/managers/factories/draftManagerFactory.js");

require("dotenv").config();

const token = process.env.TOKEN;

const loadFiles = (folderName, registerCallback, checkProperties) => {
	const foldersPath = join(__dirname, folderName);
	const folders = fs.readdirSync(foldersPath);

	for (const folder of folders) {
		try {
			const filesPath = join(foldersPath, folder);
			const stats = fs.statSync(filesPath);

			if (stats.isDirectory()) {
				const files = fs
					.readdirSync(filesPath)
					.filter((file) => file.endsWith(".js") && !file.startsWith("index"));

				for (const file of files) {
					const filePath = join(filesPath, file);
					const item = require(filePath);

					if (folderName === "commands") {
						item.category = folder;
					}
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
		} catch (error) {
			console.log(error);
			console.log(`[WARNING] Failed to load ${folderName}/${folder}`);
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
				try {
					client.once(event.name, (...args) => event.execute(...args));
				} catch (e) {
					console.log(e);
				}
			} else {
				try {
					client.on(event.name, (...args) => event.execute(...args));
				} catch (e) {
					console.log(e);
				}
			}
		},
		(event) => "name" in event && "execute" in event
	);
};

const registerCommands = () => {
	const { REST, Routes } = require("discord.js");
	const fs = require("node:fs");
	const path = require("node:path");

	require("dotenv").config();

	const token = process.env.TOKEN;
	const clientID = process.env.CLIENTID;
	const guildID = process.env.GUILDID;

	const syncCommands = async () => {
		const commands = [];
		// Grab all the command files from the commands directory you created earlier
		const foldersPath = path.join(__dirname, "commands");
		const commandFolders = fs.readdirSync(foldersPath);

		for (const folder of commandFolders) {
			// Grab all the command files from the commands directory you created earlier
			const commandsPath = path.join(foldersPath, folder);
			const commandFiles = fs
				.readdirSync(commandsPath)
				.filter((file) => file.endsWith(".js") && !file.startsWith("index"));
			// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file);
				const command = require(filePath);
				if ("data" in command && "execute" in command) {
					commands.push(command.data.toJSON());
				} else {
					console.log(
						`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
					);
				}
			}
		}

		// Construct and prepare an instance of the REST module
		const rest = new REST().setToken(token);

		// and deploy your commands!
		try {
			console.log(
				`Started refreshing ${commands.length} application (/) commands.`
			);

			// The put method is used to fully refresh all commands in the guild with the current set
			const data = await rest.put(
				Routes.applicationGuildCommands(clientID, guildID),
				{ body: commands }
			);

			// const globalData = await rest.put(Routes.applicationCommands(clientID), {
			// 	body: commands,
			// });

			console.log(
				`Successfully reloaded ${data.length} application (/) commands.`
			);
		} catch (error) {
			// And of course, make sure you catch and log any errors!
			console.error(error);
		}
	};

	syncCommands();
};

client.db = sequelize;
client.managers = {
	playerDraftManagerFactory,
	draftManagerFactory,
};
registerCommands();
loadCommands();
loadEvents();

process.on("unhandledRejection", (error) => {
	console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

client.login(token);
