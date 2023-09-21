const { AutocompleteFocusedOption, Interaction } = require("discord.js");
const { sequelize, User, Lobby, Game } = require("../models");

/**
 *
 * @param {AutocompleteFocusedOption} focusedValue
 * @param {Interaction} interaction
 */
async function gameAutocomplete(focusedValue, interaction) {
	const games = await Game.findAll();
	const gameNames = games.map((game) => game.name);
	const filteredGames = gameNames.filter((game) =>
		game?.toLowerCase().startsWith(focusedValue?.toLowerCase())
	);
	await interaction.respond(
		filteredGames.map((game) => ({ name: game, value: game }))
	);
}

async function lobbyAutocomplete(focusedValue, interaction) {
	const lobbies = await Lobby.getOpenLobbies();
	const lobbyIDs = lobbies.map((lobby) => lobby.lobby_id);
	console.log(lobbyIDs);
	const filteredLobbies = lobbyIDs.filter((lobby) =>
		(lobby + "")?.toLowerCase().startsWith((focusedValue + "")?.toLowerCase())
	);
	await interaction.respond(
		filteredLobbies.map((lobby) => ({ name: lobby, value: lobby }))
	);
}

module.exports = {
	gameAutocomplete,
	lobbyAutocomplete,
};
