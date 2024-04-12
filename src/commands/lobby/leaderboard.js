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
	Region,
	handleGameOption,
	handleSeasonOption,
	seasonOption,
	sequelize,
	baseEmbed,
} = require("./index.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const {
	countScriptCharacters,
} = require("../../utilities/utility-functions.js");

const {
	getLeaderboard,
} = require("../../dataManager/queries/stats/leaderboard.js");

const {
	generateLeaderboardImage,
} = require("../../dataManager/messages/leaderboardImage.js");

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

			const user = await User.findByPk(interaction.user.id);

			const message = await updateLeaderboard(
				interaction,
				page,
				game.game_id,
				season?.season_id,
				user.region_id
			);

			await collectButtonInteractions(
				interaction,
				message,
				game.game_id,
				season?.season_id,
				user.region_id
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
	if (page <= totalPages - 2) {
		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setLabel(">>")
			.setCustomId(`leaderboard_${totalPages}`);
		components.addComponents(button);
	}

	return components;
}

async function fetchLeaderboardData(leaderboard, offset) {
	// Create an array of promises
	const promises = leaderboard.map((user, i) => {
		let defaultNamePadding = 19;
		const scriptCharacters = countScriptCharacters(user.summoner_name);
		defaultNamePadding -= scriptCharacters;

		//prettier-ignore
		return {
			rank: `${i + 1 + offset}.`.padEnd(7, " "),
			name: `${user.summoner_name}`.padEnd(defaultNamePadding, " "),
			elo: `${parseInt(user.elo_rating)}`.padEnd(7, " "),
			winsString: `${user.wins}`,
			lossesString: `${user.losses}`.padEnd(5, " ")
		};
	});

	// Wait for all promises to resolve
	return Promise.all(promises);
}

async function updateLeaderboard(
	interaction,
	page,
	game_id,
	season_id,
	region_id
) {
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

	const region = await Region.findByPk(region_id);

	const limit = 20;
	const offset = (page - 1) * limit;

	const image = await generateLeaderboardImage(
		offset,
		limit,
		game,
		season,
		region.region_id
	);

	const leaderboard = await getLeaderboard(
		game.game_id,
		season?.season_id,
		region.region_id,
		3,
		false,
		true
	);

	if (!image) {
		return await interaction.editReply({
			content: "No leaderboards found",
			ephemeral: true,
		});
	}

	const leaderboardCount = leaderboard.length;

	const totalPages = Math.ceil(leaderboardCount / limit);

	const components = createComponents(page, totalPages);
	let hasComponents = components.components.length > 0;

	let discordMessage = await interaction.editReply({
		content: "",
		components: hasComponents ? [components] : [],
		files: [image],
	});

	return discordMessage;
}

async function collectButtonInteractions(
	interaction,
	discordMessage,
	game_id,
	season_id,
	region
) {
	const filter = (i) => {
		i.deferUpdate();
		return (
			i.user.id === interaction.user.id && i.customId.startsWith("leaderboard")
		);
	};

	const collector = interaction.channel.createMessageComponentCollector({
		filter,
		time: 300_000,
	});

	collector.on("collect", async (i) => {
		const customId = i.customId;
		const split = customId.split("_");
		const page = parseInt(split[1], 10);
		await updateLeaderboard(interaction, page, game_id, season_id, region);
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
