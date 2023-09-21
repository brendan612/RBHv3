const {
	SlashCommandStringOption,
	SlashCommandIntegerOption,
	SlashCommandUserOption,
} = require("discord.js");

/**
 *
 * @param {string} name default "game"
 * @param {string} description default "Available Games"
 * @param {boolean} isRequired default false
 * @param {boolean} hasAutocomplete default true
 * @returns {SlashCommandStringOption}
 */
function gameOption(
	name = "game",
	description = "Available Games",
	isRequired = false,
	hasAutocomplete = true
) {
	return new SlashCommandStringOption()
		.setName(name)
		.setDescription(description)
		.setRequired(isRequired)
		.setAutocomplete(hasAutocomplete);
}

/**
 *
 * @param {string} name default "lobby"
 * @param {string} description default "Available Lobbies"
 * @param {boolean} isRequired default false
 * @param {boolean} hasAutocomplete default true
 * @returns {SlashCommandIntegerOption}
 */
function lobbyOption(
	name = "lobby",
	description = "Available Lobbies",
	isRequired = false,
	hasAutocomplete = true
) {
	return new SlashCommandIntegerOption()
		.setName(name)
		.setDescription(description)
		.setRequired(isRequired)
		.setAutocomplete(hasAutocomplete);
}

/**
 *
 * @param {string} name default "target"
 * @param {string} description default "Targeted User"
 * @param {boolean} isRequired default false
 * @param {boolean} hasAutocomplete default false
 * @returns {SlashCommandUserOption}
 */
function userOption(
	name = "target",
	description = "Targeted User",
	isRequired = false
) {
	return new SlashCommandUserOption()
		.setName(name)
		.setDescription(description)
		.setRequired(isRequired);
}

module.exports = {
	gameOption,
	lobbyOption,
	userOption,
};
