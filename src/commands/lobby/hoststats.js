const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	seasonOption,
	seasonAutocomplete,
	handleSeasonOption,
	Lobby,
	User,
	Game,
	baseEmbed,
} = require("./index.js");

const { Op } = require("sequelize");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const {
	generateLobbyEmbed,
} = require("../../dataManager/messages/lobbyEmbed.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("host-stats")
		.setDescription("Host Stats")
		.addStringOption(gameOption())
		.addStringOption(seasonOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		const season = await handleSeasonOption(interaction, game.game_id);

		const whereClause = {
			game_id: game.game_id,
			closed_date: {
				[Op.ne]: null,
			},
		};

		if (season) {
			whereClause.season_id = season.season_id;
		}

		const lobbies = await Lobby.findAll({
			where: whereClause,
		});

		const hostStats = new Map();

		lobbies.forEach((lobby) => {
			const host = lobby.host_id;
			if (hostStats.has(host)) {
				hostStats.set(host, hostStats.get(host) + 1);
			} else {
				hostStats.set(host, 1);
			}
		});

		const embed = baseEmbed(
			"Host Stats",
			`${season ? season.name : "All Seasons"}`
		);

		const sortedHostStats = new Map(
			[...hostStats.entries()].sort((a, b) => b[1] - a[1])
		);

		let hostStatsString = "";
		for (const [host, lobbies] of sortedHostStats) {
			const user = await User.findByPk(host);
			hostStatsString += `${user.summoner_name} #${user.tag_line} | **${lobbies}**\n`;
		}

		embed.addFields({
			name: "Host",
			value: hostStatsString,
		});

		return await interaction.reply({ embeds: [embed] });
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			await gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "season") {
			await seasonAutocomplete(focusedValue.value, interaction);
		}
	},
};
