const { Interaction, SlashCommandStringOption } = require("discord.js");
const { sequelize, User, Lobby, Game } = require("../models");

/**
 *
 * @param {Interaction} interaction
 * @returns {Game}
 */
async function handleGameOption(interaction) {
	const gameName = interaction.options.getString("game") ?? "League of Legends";
	return await Game.findOne({ where: { name: gameName } });
}

/**
 *
 * @param {Interaction} interaction
 * @returns {Lobby}
 */
async function handleLobbyOption(interaction, game_id) {
	let lobby = null;
	let lobby_id = interaction.options.getInteger("lobby");
	if (!lobby_id) {
		//get earliest open lobby
		lobby = await Lobby.findOne({
			where: { closed_date: null, game_id: game_id },
			order: [["created_at", "ASC"]],
		});
	} else {
		lobby = await Lobby.findOne({ where: { lobby_id: lobby_id } });
	}

	return lobby;
}

/**
 *
 * @param {Interaction} interaction
 * @returns {User}
 */
async function handleUserOption(interaction, optionName) {
	let user_id = null;
	const target = interaction.options.getUser(optionName);
	if (target) {
		user_id = target.id;
	} else {
		await User.findOne({
			where: { user_id: interaction.member.id },
		}).then((user) => {
			user_id = user.user_id;
		});
	}

	return user_id;
}

module.exports = {
	handleGameOption,
	handleLobbyOption,
	handleUserOption,
};
