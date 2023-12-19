const { UserEloRating, MatchPlayer, Match } = require("../../models/index.js");
const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	seasonAutocomplete,
	gameOption,
	lobbyOption,
	User,
	Season,
	Game,
	handleGameOption,
	handleLobbyOption,
	handleSeasonOption,
	seasonOption,
	Sequelize,
	sequelize,
	baseEmbed,
} = require("./index.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
	async execute(
		interaction,
		page = 1,
		commandInteraction = null,
		game_id = null,
		season_id = null
	) {
		await interaction.deferReply();
		commandInteraction = commandInteraction ?? interaction;

		let game = null;
		if (game_id) {
			game = await Game.findByPk(game_id);
		} else {
			game = await handleGameOption(commandInteraction);
		}

		let season = null;
		if (season_id) {
			season = await Season.findByPk(season_id);
		} else {
			season = await handleSeasonOption(commandInteraction, game.game_id);
		}

		const whereCondition = {
			game_id: game.game_id,
		};
		if (season) {
			whereCondition.season_id = season.season_id;
		}

		const limit = 30;
		const offset = (page - 1) * limit;

		const results = await sequelize.query(
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
						COUNT(DISTINCT match_id) AS matches_played
					FROM 
						MatchPlayers
					GROUP BY 
						user_id) mp ON u.user_id = mp.user_id
				WHERE uer.user_id > 20
				GROUP BY 
					uer.user_id, mp.matches_played
				HAVING 
					mp.matches_played > 3
				ORDER BY 
					average_elo DESC
				LIMIT :limit OFFSET :offset;`,
			{
				replacements: { limit, offset },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		const leaderboard = results;

		const leaderboardCountResults = await sequelize.query(
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
						COUNT(DISTINCT match_id) AS matches_played
					FROM 
						MatchPlayers
					GROUP BY 
						user_id) mp ON u.user_id = mp.user_id
				WHERE uer.user_id > 20
				GROUP BY 
					uer.user_id, mp.matches_played
				HAVING 
					mp.matches_played > 3`,
			{
				replacements: { limit, offset },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		const leaderboardCount = leaderboardCountResults.length;

		if (leaderboard.length === 0) {
			await interaction.reply({
				content: "No leaderboards found",
				ephemeral: true,
			});
			return;
		}

		const title =
			(season ? `Season ${season.season_number}` : "All-Time") + " Leaderboard";

		const embed = baseEmbed(title, `Leaderboard for ${game.name}`);

		let message =
			"```diff\n" +
			"+RANK".padEnd(7, " ") +
			"NAME".padEnd(20, " ") +
			"ELO".padEnd(8, " ") +
			"WINS".padEnd(5, "") +
			" LOSSES```";

		for (let i = 0; i < leaderboard.length; i++) {
			const user = leaderboard[i];
			if (i === 0) {
				message += "```diff\n";
			} else if (i === 3) {
				message += "``````";
			}
			let matches = [];
			if (season) {
				matches = await MatchPlayer.findAll({
					where: {
						user_id: user.user_id,
					},
					include: [
						{
							model: Match,
							as: "Match",
							required: true,
							where: {
								game_id: game.game_id,
								season_id: season.season_id,
							},
						},
					],
				});
			} else {
				matches = await MatchPlayer.findAll({
					where: {
						user_id: user.user_id,
					},
					include: [
						{
							model: Match,
							as: "Match",
							required: true,
							where: {
								game_id: game.game_id,
							},
						},
					],
				});
			}

			const userModel = await User.findByPk(user.user_id);

			const wins = matches.filter((match) => match.elo_change > 0).length;
			const losses = matches.filter((match) => match.elo_change < 0).length;

			const rank = `${i + 1 + offset}.`.padEnd(7, " ");
			const name = `${userModel.summoner_name}`.padEnd(20, " ");
			const elo = `${parseInt(user.average_elo)}`.padEnd(8, " ");
			const winsString = `${wins}`.padEnd(5, " ");
			const lossesString = `${losses}`.padEnd(5, " ");
			message += `${rank}${name}${elo}${winsString}${lossesString}\n`;
		}

		embed.setDescription(message + "```");

		const totalPages = Math.ceil(leaderboardCount / limit);
		embed.setFooter({ text: `Page ${page} of ${totalPages}` });

		const components = new ActionRowBuilder();
		let hasComponents = false;

		if (page <= totalPages && page > 2) {
			hasComponents = true;
			const button = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel("<<")
				.setCustomId(`leaderboard_${1}`);
			components.addComponents(button);
		}
		if (page <= totalPages && page > 1) {
			hasComponents = true;
			const button = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel("<")
				.setCustomId(`leaderboard_${parseInt(page - 1)}`);
			components.addComponents(button);
		}
		if (page < totalPages) {
			hasComponents = true;
			const button = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(">")
				.setCustomId(`leaderboard_${parseInt(page + 1)}`);
			components.addComponents(button);
		}
		if (page < totalPages - 2) {
			hasComponents = true;
			const button = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(">>")
				.setCustomId(`leaderboard_${totalPages}`);
			components.addComponents(button);
		}

		let discordMessage = await interaction.editReply({
			embeds: [embed],
			components: hasComponents ? [components] : [],
		});

		try {
			const filter = (i) => i.user.id === interaction.user.id;
			const i = await discordMessage.awaitMessageComponent({
				filter,
				time: 60000,
			});
			const customId = i.customId;
			const split = customId.split("_");
			const page = parseInt(split[1]);
			this.execute(i, page, commandInteraction, game_id, season_id);
		} catch {
			try {
				discordMessage.edit({
					embeds: [embed],
					components: [],
				});
			} catch {}
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
