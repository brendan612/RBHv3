const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	seasonAutocomplete,
	gameOption,
	seasonOption,
	userOption,
	Match,
	MatchPlayer,
	Season,
	User,
	Champion,
	handleGameOption,
	handleUserOption,
	handleSeasonOption,
	baseEmbed,
	sequelize,
} = require("./index.js");
const {
	getMatchesPlayedForSeason,
	getChampionMatchDataForServer,
	getCaptainStatsForServer,
} = require("../../dataManager/queries/stats/stats.js");
const { LeagueRoleEmojis } = require("../../assets/emojis.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("season-stats")
		.setDescription("Server stats for a season")
		.addStringOption(gameOption())
		.addStringOption(seasonOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply();
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const season = await handleSeasonOption(interaction, game.game_id);
		const user = await handleUserOption(interaction, "target");

		const matches = await getMatchesPlayedForSeason(
			game.game_id,
			season?.season_id,
			user.region_id
		);
		const matchCount = matches.length;
		const redWins = matches.filter((m) => m.winning_team === "red").length;
		const blueWins = matchCount - redWins;
		const redWinRate = ((redWins / matchCount) * 100).toFixed(2);
		const blueWinRate = ((blueWins / matchCount) * 100).toFixed(2);

		const championStats = await getChampionMatchDataForServer(
			game.game_id,
			season?.season_id,
			user.region_id
		);
		const top5Champions = championStats.slice(0, 5);
		const bottom5Champions = championStats.slice(-5).reverse();

		const highestWinRateChampions = championStats
			.filter((champion) => champion.wins + champion.losses >= 3)
			.sort(
				(a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)
			)
			.slice(0, 5);

		const lowestWinRateChampions = championStats
			.filter((champion) => champion.wins + champion.losses >= 3)
			.sort(
				(a, b) => a.wins / (a.wins + a.losses) - b.wins / (b.wins + b.losses)
			)
			.slice(0, 5);

		const captainStats = await getCaptainStatsForServer(
			game.game_id,
			season?.season_id,
			user.region_id
		);

		const highestWinRateCaptains = captainStats
			.filter((captain) => captain.wins + captain.losses >= 3)
			.sort(
				(a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses)
			)
			.slice(0, 5);

		const lowestWinRateCaptains = captainStats
			.filter((captain) => captain.wins + captain.losses >= 3)
			.sort(
				(a, b) => a.wins / (a.wins + a.losses) - b.wins / (b.wins + b.losses)
			)
			.slice(0, 5);

		const embed = baseEmbed("Server Season Stats", `Stats for ${season.name}`);

		embed.addFields(
			{
				name: "Matches Played",
				value: matchCount.toString(),
				inline: true,
			},
			{
				name: "Blue Side WR",
				value: `${blueWinRate}%`,
				inline: true,
			},
			{
				name: "Red Side WR",
				value: `${redWinRate}%`,
				inline: true,
			}
		);

		embed.addFields(
			{ name: "\u200B", value: "\u200B" } // This non-inline field might not always cause the desired effect
		);

		embed.addFields(
			{
				name: "Most Played Champions",
				value: top5Champions
					.map(
						(c) =>
							`${c.name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			},
			{
				name: "Least Played Champions",
				value: bottom5Champions
					.map(
						(c) =>
							`${c.name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			}
		);
		embed.addFields(
			{ name: "\u200B", value: "\u200B" } // This non-inline field might not always cause the desired effect
		);
		embed.addFields(
			{
				name: "Highest Win Rate Champions",
				value: highestWinRateChampions
					.map(
						(c) =>
							`${c.name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			},
			{
				name: "Lowest Win Rate Champions",
				value: lowestWinRateChampions
					.map(
						(c) =>
							`${c.name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			}
		);

		embed.addFields(
			{ name: "\u200B", value: "\u200B" } // This non-inline field might not always cause the desired effect
		);

		embed.addFields(
			{
				name: "Highest Captain WR",
				value: highestWinRateCaptains
					.map(
						(c) =>
							`${c.summoner_name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			},
			{
				name: "Lowest Captain WR",
				value: lowestWinRateCaptains
					.map(
						(c) =>
							`${c.summoner_name} | ${c.wins + c.losses} games | ${(
								(c.wins / (c.wins + c.losses)) *
								100
							).toFixed(2)}% WR`
					)
					.join("\n"),
				inline: true,
			}
		);

		return await interaction.editReply({
			embeds: [embed],
		});
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "season") {
			seasonAutocomplete(focusedValue.value, interaction);
		}
	},
};
