const { Collection } = require("discord.js");
const fs = require("fs");
const { join } = require("node:path");
const { sequelize } = require("./models");
const GlobalCacheManager = require("./dataManager/managers/cacheManager.js");
const client = require("./client.js");
client.cache = new GlobalCacheManager();
client.features = new Map();
client.invites = new Map();
client.serverChannels = [];
client.serverRoles = [];

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
                const files = fs.readdirSync(filesPath).filter((file) => file.endsWith(".js") && !file.startsWith("index"));

                for (const file of files) {
                    const filePath = join(filesPath, file);
                    const item = require(filePath);

                    if (folderName === "commands") {
                        item.category = folder;
                    }
                    if (checkProperties(item)) {
                        registerCallback(item);
                    } else {
                        console.log(`[WARNING] The file at ${filePath} is missing required properties.`);
                    }
                }
            } else {
                const item = require(filesPath);

                if (checkProperties(item)) {
                    registerCallback(item);
                } else {
                    console.log(`[WARNING] The file at ${filesPath} is missing required properties.`);
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

client.db = sequelize;
client.managers = {
    playerDraftManagerFactory,
    draftManagerFactory,
};

loadCommands();
loadEvents();

process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

client.login(token);
