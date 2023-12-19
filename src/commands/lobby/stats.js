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
	handleGameOption,
	handleUserOption,
	handleSeasonOption,
	baseEmbed,
	sequelize,
} = require("./index.js");
const { getStatsForUser } = require("../../dataManager/queries/stats/stats.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("stats")
		.setDescription("Stats for yourself or a user")
		.addStringOption(gameOption())
		.addStringOption(seasonOption())
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		const game = await handleGameOption(interaction);
		const season = await handleSeasonOption(interaction, game.game_id);
		const user = await handleUserOption(interaction, "target");

		const { wins, losses, rank, elo_rating } = await getStatsForUser(
			user.user_id,
			game.game_id,
			season?.season_id
		);

		console.log(wins, losses, rank, elo_rating);
		//prettier-ignore
		const header = `${"Rank".padEnd(6)} ${"Elo".padEnd(8)} ${"W".padEnd(6)} ${"L".padEnd(6)}`;
		//prettier-ignore
		const data = `${(rank === -1 ? "UR" : rank.toString()).padEnd(6)} ${elo_rating.toString().padEnd(8)} ${wins.toString().padEnd(6)} ${losses.toString().padEnd(6)}`;

		const embed = baseEmbed(
			`${season ? season.name : "All-Time"} Stats for ${user.summoner_name}`,
			"```" + header + "``````" + data + "```",
			false
		);

		if (rank === -1) {
			//prettier-ignore
			embed.setFooter({
				text: `Unranked - Play ${(3 - (wins + losses)) } more game(s) to get a rank`,
			});
		}

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
