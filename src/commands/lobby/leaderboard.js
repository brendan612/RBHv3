const { MatchPlayer, Match } = require("../../models/index.js");
const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	seasonAutocomplete,
	gameOption,
	User,
	Season,
	Game,
	handleGameOption,
	handleSeasonOption,
	seasonOption,
	sequelize,
	baseEmbed,
} = require("./index.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const franc = require("franc");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("View the leaderboard for a game")
		.addStringOption(gameOption())
		.addStringOption(seasonOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		try {
			await interaction.deferReply();
			const page = 1;

			const game = await handleGameOption(interaction);
			const season = await handleSeasonOption(interaction, game.game_id);

			const message = await updateLeaderboard(
				interaction,
				page,
				game.game_id,
				season?.season_id
			);

			await collectButtonInteractions(
				interaction,
				message,
				game.game_id,
				season?.season_id
			);
		} catch (e) {
			console.log(e);
		}
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

function createComponents(page, totalPages) {
	const components = new ActionRowBuilder();
	if (page <= totalPages && page > 2) {
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel("<<")
			.setCustomId(`leaderboard_${1}`);
		components.addComponents(button);
	}
	if (page <= totalPages && page > 1) {
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel("<")
			.setCustomId(`leaderboard_${parseInt(page - 1)}`);
		components.addComponents(button);
	}
	if (page < totalPages) {
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel(">")
			.setCustomId(`leaderboard_${parseInt(page + 1)}`);
		components.addComponents(button);
	}
	if (page < totalPages - 2) {
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel(">>")
			.setCustomId(`leaderboard_${totalPages}`);
		components.addComponents(button);
	}

	return components;
}

async function fetchLeaderboardData(leaderboard, season, game, offset) {
	// Create an array of promises
	const promises = leaderboard.map(async (user, i) => {
		const whereClause = {
			...(season ? { season_id: season.season_id } : {}),
			game_id: game.game_id,
		};

		// Fetch matches for the user
		const matches = await MatchPlayer.findAll({
			where: { user_id: user.user_id },
			include: [
				{ model: Match, as: "Match", required: true, where: whereClause },
			],
		});

		const userModel = await User.findByPk(user.user_id);

		const wins = matches.filter((match) => match.elo_change > 0).length;
		const losses = matches.filter((match) => match.elo_change < 0).length;

		let defaultNamePadding = 20;
		let language = franc(userModel.summoner_name);
		console.log(language);
		if (language != "eng") {
			defaultNamePadding = 10;
		}

		return {
			rank: `${i + 1 + offset}.`.padEnd(7, " "),
			name: `${userModel.summoner_name}`.padEnd(defaultNamePadding, " "),
			elo: `${parseInt(user.average_elo)}`.padEnd(8, " "),
			winsString: `${wins}`.padEnd(5, " "),
			lossesString: `${losses}`.padEnd(5, " "),
		};
	});

	// Wait for all promises to resolve
	return Promise.all(promises);
}

async function updateLeaderboard(interaction, page, game_id, season_id) {
	let game = null;
	let season = null;

	if (game_id) {
		game = await Game.findByPk(game_id);
	} else {
		game = await Game.findByPk(1);
	}

	if (season_id) {
		season = await Season.findByPk(season_id);
	}

	const limit = 30;
	const offset = (page - 1) * limit;

	const [results, leaderboardCountResults] = await Promise.all([
		sequelize.query(
			`
				SELECT
					uer.user_id,
					AVG(uer.elo_rating) AS average_elo,
					mp.matches_played
				FROM
					UserEloRatings uer
				JOIN
					Users u ON uer.user_id = u.user_id
				LEFT JOIN
					(SELECT
						user_id,
						COUNT(DISTINCT MatchPlayers.match_id) AS matches_played
					FROM
						MatchPlayers
					JOIN
						Matches m ON MatchPlayers.match_id = m.match_id
					WHERE m.game_id = :game_id
					${season_id ? "AND m.season_id = :season_id" : ""}
					GROUP BY
						user_id) mp ON u.user_id = mp.user_id
				WHERE uer.user_id > 20
				AND uer.game_id = :game_id
				${season_id ? "AND uer.season_id = :season_id" : ""}
				GROUP BY
					uer.user_id, mp.matches_played
				HAVING
					mp.matches_played >= 3
				ORDER BY
					average_elo DESC
				LIMIT :limit OFFSET :offset;`,
			{
				replacements: { limit, offset, game_id, season_id },
				type: sequelize.QueryTypes.SELECT,
			}
		),
		sequelize.query(
			`
				SELECT
					uer.user_id,
					AVG(uer.elo_rating) AS average_elo,
					mp.matches_played
				FROM
					UserEloRatings uer
				JOIN
					Users u ON uer.user_id = u.user_id
				LEFT JOIN
					(SELECT
						user_id,
						COUNT(DISTINCT MatchPlayers.match_id) AS matches_played
					FROM
						MatchPlayers
					JOIN
						Matches m ON MatchPlayers.match_id = m.match_id
					WHERE m.game_id = :game_id
					${season_id ? "AND m.season_id = :season_id" : ""}
					GROUP BY
						user_id) mp ON u.user_id = mp.user_id
				WHERE uer.user_id > 20
				AND uer.game_id = :game_id
				${season_id ? "AND uer.season_id = :season_id" : ""}
				GROUP BY
					uer.user_id, mp.matches_played
				HAVING
					mp.matches_played >= 3`,
			{
				replacements: { limit, offset, game_id, season_id },
				type: sequelize.QueryTypes.SELECT,
			}
		),
	]);

	const leaderboard = results;

	const leaderboardCount = leaderboardCountResults.length;

	if (leaderboard.length === 0) {
		return await interaction.editReply({
			content: "No leaderboards found",
			ephemeral: true,
		});
	}

	const title = (season ? season.name : "All-Time") + " Leaderboard";

	const embed = baseEmbed(title, `Leaderboard for ${game.name}`);

	let message =
		"```diff\n" +
		"+RANK".padEnd(7, " ") +
		"NAME".padEnd(20, " ") +
		"ELO".padEnd(8, " ") +
		"WINS".padEnd(5, "") +
		" LOSSES```";

	const leaderboardData = await fetchLeaderboardData(
		leaderboard,
		season,
		game,
		offset
	);

	message += "```asciidoc\n";
	leaderboardData.forEach((user, i) => {
		if (i === 3 && page === 1) {
			message += "``````asciidoc\n";
		}

		message += `${user.rank}${user.name}${user.elo}${user.winsString}${user.lossesString}\n`;
	});

	embed.setDescription(message + "```");

	const totalPages = Math.ceil(leaderboardCount / limit);
	embed.setFooter({ text: `Page ${page} of ${totalPages}` });

	const components = createComponents(page, totalPages);
	let hasComponents = components.components.length > 0;

	let discordMessage = await interaction.editReply({
		content: "",
		embeds: [embed],
		components: hasComponents ? [components] : [],
	});

	return discordMessage;
}

async function collectButtonInteractions(
	interaction,
	discordMessage,
	game_id,
	season_id
) {
	const filter = (i) => {
		i.deferUpdate();
		return (
			i.user.id === interaction.user.id && i.customId.startsWith("leaderboard")
		);
	};

	const collector = interaction.channel.createMessageComponentCollector({
		filter,
		time: 60000,
	});

	collector.on("collect", async (i) => {
		const customId = i.customId;
		const split = customId.split("_");
		const page = parseInt(split[1], 10);
		await updateLeaderboard(interaction, page, game_id, season_id);
	});

	collector.on("end", async (i) => {
		try {
			await discordMessage.edit({
				embeds: [embed],
				components: [],
			});
		} catch {}
	});
}
