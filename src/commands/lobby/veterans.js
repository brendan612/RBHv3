const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	gameOption,
	handleGameOption,
	Lobby,
	User,
	Game,
	Season,
	MatchPlayer,
	Match,
	baseEmbed,
	Sequelize,
} = require("./index.js");

const { AttachmentBuilder } = require("discord.js");
const { Op } = require("sequelize");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const Canvas = require("@napi-rs/canvas");
const sharp = require("sharp");
const path = require("path");
const { prepareImage } = require("../../utilities/utility-functions.js");

const veteransBackground = path.join(
	__dirname,
	"../../assets/images/veterans/veterans.jpg"
);
const canvasWidth = 1380;
const canvasHeight = 776;

const borderOffset = 8;
const textSectionWidth = 750;
const textSectionHeight = 760;

module.exports = {
	data: new SlashCommandBuilder()
		.setName("veterans")
		.setDescription("Players with the most matches played")
		.addStringOption(gameOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);

		const season = await Season.getCurrentSeason(game.game_id);
		const matchPlayers = await MatchPlayer.findAll({
			attributes: [
				"user_id",
				[
					Sequelize.fn(
						"SUM",
						Sequelize.literal(`CASE WHEN elo_change < 0 THEN 1 ELSE 0 END`)
					),
					"losses",
				],
				[
					Sequelize.fn(
						"SUM",
						Sequelize.literal(`CASE WHEN elo_change > 0 THEN 1 ELSE 0 END`)
					),
					"wins",
				],
				[
					Sequelize.fn("COUNT", Sequelize.col("MatchPlayer.user_id")),
					"total_matches",
				],
			],
			include: [
				{
					model: Match,
					attributes: [],
					where: {
						game_id: game.game_id,
						season_id: season.season_id,
					},
				},
			],
			group: ["MatchPlayer.user_id"],
			order: [[Sequelize.literal("total_matches"), "DESC"]],
			limit: 10,
		});

		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext("2d");
		const background = await prepareImage(
			veteransBackground,
			canvasWidth,
			canvasHeight
		);
		ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);

		GlobalFonts.registerFromPath(
			path.join(__dirname, "../../assets/fonts/postgame.ttf"),
			"PostGame"
		);
		ctx.font = "bold 69px PostGame";

		ctx.fillStyle = "white";

		const title = "Queen's Croquet Veterans";
		const titleMetrics = ctx.measureText(title);
		ctx.fillText(
			title,
			borderOffset + textSectionWidth / 2 - titleMetrics.width / 2,
			100
		);

		ctx.font = "bold 40px PostGame";

		let maxNameWidth = 0;

		matchPlayers.forEach(async (player) => {
			const user = await User.findByPk(player.user_id);

			const name = user.summoner_name + "#" + user.tag_line;
			const nameMetrics = ctx.measureText(name);
			if (nameMetrics.width > maxNameWidth) {
				maxNameWidth = nameMetrics.width;
			}
		});

		for (let i = 0; i < matchPlayers.length; i++) {
			const player = matchPlayers[i];
			const user = await User.findByPk(player.user_id);
			const wins = parseInt(player.dataValues.wins);
			const losses = parseInt(player.dataValues.losses);

			const name =
				`${(i + 1).toString().padStart(2, " ")}. ` +
				user.summoner_name +
				"#" +
				user.tag_line;

			const winLoss = `${wins}W ${losses}L`;

			ctx.fillText(
				name,
				borderOffset + 50,
				200 + matchPlayers.indexOf(player) * 50
			);

			ctx.fillText(
				winLoss,
				borderOffset + 50 + maxNameWidth + 150,
				200 + matchPlayers.indexOf(player) * 50
			);
		}

		const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
			name: "veterans.png",
		});

		return interaction.reply({
			files: [attachment],
		});
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
