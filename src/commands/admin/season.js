const {
	SlashCommandBuilder,
	Interaction,
	User,
	Season,
	Lobby,
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
const { channels } = require(`../../../${process.env.CONFIG_FILE}`);
const misc_roles = require(`../../../${process.env.CONFIG_FILE}`).roles
	.misc_roles;

const {
	generateSeasonEndEmbed,
} = require("../../dataManager/messages/seasonEndEmbed.js");
const {
	getVeteransForSeason,
} = require("../../dataManager/queries/stats/stats");
const {
	getLeaderboard,
} = require("../../dataManager/queries/stats/leaderboard");

const client = require("../../client.js");

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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("generate-end-rewards")
				.setDescription(
					"Generate end of season rewards for a game. And Hall of Fame."
				)
				.addStringOption(gameOption())
				.addStringOption(seasonOption())
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply();

		const game = await handleGameOption(interaction);

		const now = new Date();

		if (interaction.options.getSubcommand() === "create") {
			const season_name = interaction.options.getString("season_name");
			const start_date = interaction.options.getString("start_date");
			const end_date = interaction.options.getString("end_date");

			const currentSeason = await Season.getCurrentSeason(game.game_id);

			if (currentSeason && currentSeason.end_date > now) {
				await Season.endSeason(game.game_id, currentSeason.season_id);
				await generateSeasonEndEmbed(game.game_id, currentSeason.season_id);
			}

			const newSeason = await Season.createSeason(
				season_name,
				game.game_id,
				start_date,
				end_date
			);

			const channel_id = channels.games["League of Legends"];
			const channel = await interaction.guild.channels.fetch(channel_id);
			const start_string = formatDateToMMDDYYYY(newSeason.start_date);
			const end_string = formatDateToMMDDYYYY(newSeason.end_date);

			channel
				.setTopic(`${newSeason.name} | ${start_string} - ${end_string}`)
				.then((newChannel) =>
					console.log(`Channel's new topic is ${newChannel.topic}`)
				)
				.catch(console.error);

			await interaction.editReply({
				content: `Created season \`\`${newSeason.name}\`\` for ${game.name}`,
			});
		} else if (interaction.options.getSubcommand() === "end") {
			let currentSeason = await Season.getCurrentSeason(game.game_id);
			if (!currentSeason) {
				currentSeason = await Season.findOne({
					where: { game_id: game.game_id },
					order: [["end_date", "DESC"]],
				});
			}
			await Season.endSeason(game.game_id, currentSeason.season_id);
			await generateSeasonEndEmbed(game.game_id, currentSeason.season_id);

			await interaction.editReply({
				content: `Ended season \`\`${currentSeason.name}\`\` for ${game.name}`,
			});
		} else if (interaction.options.getSubcommand() === "view") {
			const season_id = interaction.options.getString("season") ?? "current";
			const season =
				season_id == "current"
					? await Season.getCurrentSeason(game.game_id)
					: await Season.findByPk(season_id);

			if (!season) {
				await interaction.editReply({
					content: `No active season for ${game.name}. Use \`\`/season create\`\` to create a new season.`,
				});
				return;
			}

			await interaction.editReply({
				content: `Current season for ${game.name}: \`\`${season.name}\`\` \nStart date: \`\`${season.start_date}\`\` \nEnd date: \`\`${season.end_date}\`\``,
			});
		} else if (interaction.options.getSubcommand() === "generate-end-rewards") {
			const season_id = interaction.options.getString("season") ?? "current";
			const season = await Season.findByPk(season_id);
			await generateSeasonEndEmbed(game.game_id, season.season_id);

			const qc_veteran_role = client.guild.roles.cache.find(
				(role) => role.name === misc_roles.qc_veteran
			);

			const qc_top_veteran_role = client.guild.roles.cache.find(
				(role) => role.name === misc_roles.qc_top_veteran
			);

			const qc_top_3_role = client.guild.roles.cache.find(
				(role) => role.name === misc_roles.qc_top_3
			);

			const qc_champion_role = client.guild.roles.cache.find(
				(role) => role.name === misc_roles.qc_champion
			);

			try {
				const veterans = await getVeteransForSeason(game_id, season_id, "NA");

				const topVeteran = veterans[0];
				const otherVeterans = veterans.slice(1);
				const topVeteranUser = await client.guild.members.fetch(
					topVeteran.user_id
				);
				topVeteranUser.roles.add(qc_top_veteran_role);
				const topVeteranService = await UserService.createUserService(
					topVeteran.user_id
				);
				await topVeteranService.addMoney(
					10000 * topVeteran.dataValues.total_matches
				); //top veteran

				otherVeterans.forEach(async (veteran) => {
					const user = await client.guild.members.fetch(veteran.user_id);
					user.roles.add(qc_veteran_role);
					const userService = await UserService.createUserService(
						veteran.user_id
					);
					await userService.addMoney(1000 * veteran.dataValues.total_matches); //veteran
				});

				const leaderboard = await getLeaderboard(
					game_id,
					season_id,
					"NA",
					3,
					false
				);

				const champion = leaderboard[0];
				const top3 = leaderboard.slice(1, 2);

				top3.forEach(async (top) => {
					const user = await client.guild.members.fetch(top.user_id);
					user.roles.add(qc_top_3_role);
					const userService = await UserService.createUserService(top.user_id);
					if (top.user_id === leaderboard[1].user_id) {
						userService.addMoney(2500000); //second place
					}

					if (top.user_id === leaderboard[2].user_id) {
						userService.addMoney(1250000); //third place
					}
				});

				const championUser = await client.guild.members.fetch(champion.user_id);
				championUser.roles.add(qc_champion_role);
				const userService = await UserService.createUserService(
					champion.user_id
				);
				await userService.addMoney(5000000); //first place

				const whereClause = {
					game_id: game_id,
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

				hostStats.forEach(async (lobbies, host) => {
					const user = await UserService.createUserService(host);
					await user.addMoney(lobbies * 10000);
				});
			} catch (e) {
				console.log("Error generating end of season rewards");
				console.log(e);
			}

			return await interaction.editReply({
				content: `Generated end of season rewards for ${season.name}`,
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
