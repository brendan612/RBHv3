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

const {
	generateVeteransImage,
} = require("../../dataManager/messages/veteransImage.js");

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

		const attachment = await generateVeteransImage(game, season);

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
