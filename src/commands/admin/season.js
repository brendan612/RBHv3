const {
	SlashCommandBuilder,
	Interaction,
	User,
	Season,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	seasonAutocomplete,
	seasonOption,
} = require("./index.js");
const UserService = require("../../dataManager/services/userService.js");
const UserLevelManager = require("../../dataManager/managers/userLevelManager.js");
const ms = require("ms");
const {
	formatDateToMMDDYYYY,
} = require("../../utilities/utility-functions.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("season")
		.setDescription("Manage a season")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new season")
				.addStringOption(gameOption())
				.addStringOption((option) =>
					option
						.setName("season_name")
						.setDescription(
							"Name of the season. Will default to season number if not provided"
						)
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("start_date")
						.setDescription(
							"Start date of the season. Format: MM/DD/YYYY. Defaults to today"
						)
						.setRequired(false)
				)
				.addStringOption((option) =>
					option
						.setName("end_date")
						.setDescription(
							"End date of the season. Format: MM/DD/YYYY. Defaults to end of the month"
						)
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("end")
				.setDescription("End the current season for a game")
				.addStringOption(gameOption())
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("view")
				.setDescription("View a season for a game.")
				.addStringOption(gameOption())
				.addStringOption(seasonOption())
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);

		const now = new Date();

		if (interaction.options.getSubcommand() === "create") {
			const season_name = interaction.options.getString("season_name");
			const start_date = interaction.options.getString("start_date");
			const end_date = interaction.options.getString("end_date");

			const currentSeason = await Season.getCurrentSeason(game.game_id);

			if (currentSeason.end_date > now) {
				currentSeason.end_date = now;
				await currentSeason.save();
			}

			const newSeason = await Season.createSeason(
				season_name,
				game.game_id,
				start_date,
				end_date
			);

			const channel = await interaction.guild.channels.fetch(
				interaction.channelId
			);

			await channel.setTopic(
				`${newSeason.name} | ${formatDateToMMDDYYYY(
					newSeason.start_date
				)} - ${formatDateToMMDDYYYY(newSeason.end_date)}`
			);

			await interaction.reply({
				content: `Created season \`\`${newSeason.name}\`\` for ${game.name}`,
			});
		} else if (interaction.options.getSubcommand() === "end") {
			const season = await Season.getCurrentSeason(game.game_id);
			season.end_date = now;
			await season.save();

			await interaction.reply({
				content: `Ended season \`\`${season.name}\`\` for ${game.name}`,
			});
		} else if (interaction.options.getSubcommand() === "view") {
			const season_id = interaction.options.getString("season") ?? "current";
			const season =
				season_id == "current"
					? await Season.getCurrentSeason(game.game_id)
					: await Season.findByPk(season_id);

			await interaction.reply({
				content: `Current season for ${game.name}: \`\`${season.name}\`\` \nStart date: \`\`${season.start_date}\`\` \nEnd date: \`\`${season.end_date}\`\``,
			});
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
