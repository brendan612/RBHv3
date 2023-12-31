const { AutocompleteFocusedOption, Interaction } = require("discord.js");
const {
	sequelize,
	User,
	Lobby,
	Game,
	Season,
	Champion,
	Draft,
	DraftRound,
} = require("../models");
const { formatDateToMMDDYYYY } = require("../utilities/utility-functions.js");

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
	const lobbyDetails = lobbies.map((lobby) => ({
		label: `${lobby.Game.name} Lobby #${lobby.lobby_id} (${lobby.Users.length}/10) - Hosted By: ${lobby.Host.summoner_name}`,
		value: lobby.lobby_id.toString(),
	}));

	// Convert focusedValue to a lowercase string for case-insensitive comparison
	const focusedValueLower = focusedValue.toLowerCase();

	const filteredLobbyDetails = lobbyDetails
		.filter((detail) => {
			// Check if the detail label or the lobby_id starts with the focusedValue
			return (
				detail.label.toLowerCase().includes(focusedValueLower) ||
				detail.value.startsWith(focusedValue)
			);
		})
		.slice(0, 25); // Limit to 25 results per Discord restrictions

	await interaction.respond(
		filteredLobbyDetails.map((detail) => ({
			name: detail.label, // The label for the user to see
			value: detail.value, // The value to be used programmatically
		}))
	);
}

async function seasonAutocomplete(focusedValue, interaction) {
	let game = interaction.options.getString("game") ?? "League of Legends";
	const seasons = await Season.findAll({
		include: [
			{
				model: Game,
				as: "Game",
				required: true,
				where: { name: game },
			},
		],
		order: [["start_date", "DESC"]],
	});

	const focusedValueLower = focusedValue.toLowerCase();

	const seasonDetails = seasons.map((season) => ({
		label: `${season.name} (${formatDateToMMDDYYYY(
			season.start_date
		)} - ${formatDateToMMDDYYYY(season.end_date)})`,
		value: season.season_id.toString(),
	}));

	const filteredSeasonDetails = seasonDetails
		.filter((detail) => {
			// Check if the detail label or the lobby_id starts with the focusedValue
			return (
				detail.label.toLowerCase().includes(focusedValueLower) ||
				detail.value.startsWith(focusedValue)
			);
		})
		.slice(0, 23); // Limit to 25 - (auto inserted) results per Discord restrictions

	let mappedSeasons = [
		{ label: "Current", value: "current" },
		{ label: "All-Time", value: "all" },
	];

	filteredSeasonDetails.push(...mappedSeasons);

	await interaction.respond(
		filteredSeasonDetails.map((detail) => ({
			name: detail.label, // The label for the user to see
			value: detail.value, // The value to be used programmatically
		}))
	);
}

async function championAutocomplete(focusedValue, interaction) {
	const champions = await Champion.findAll({
		attributes: ["champion_id", "name"],
		order: sequelize.literal("name ASC"),
	});
	const championDetails = champions.map((champ) => ({
		label: champ.name,
		value: champ.champion_id.toString(),
	}));
	const filteredChampions = championDetails
		.filter(
			(champion) =>
				champion.label
					.replace("'", "")
					.replace(" ", "")
					.toLowerCase()
					.startsWith(focusedValue?.toLowerCase()) ||
				champion.value.startsWith(focusedValue)
		)
		.slice(0, 25);

	await interaction.respond(
		filteredChampions.map((champion) => ({
			name: champion.label,
			value: champion.value,
		}))
	);
}

module.exports = {
	gameAutocomplete,
	lobbyAutocomplete,
	seasonAutocomplete,
	championAutocomplete,
};
