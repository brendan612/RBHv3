const { User } = require("../../models");
const {
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	AttachmentBuilder,
} = require("discord.js");
const { baseEmbed } = require("../../components/embed.js");
const { getSummonerByRiotID } = require("../../api/riot/riotApiHandler.js");
const { inhouse_icon_url, channels } = require("../../../config.json");
const client = require("../../client.js");
const fetch = require("node-fetch");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const UserLevelManager = require("../managers/userLevelManager.js");

/**
 *
 * @param {bigint} user_id
 * @param {string} game_name
 * @param {string} tag_line
 * @param {GuildMember} referrer
 * @returns { bool }
 */
async function generateVerifyEmbed(user_id, game_name, tag_line, referrer) {
	const guild = await client.guilds.fetch(client.guildID);
	const embed = baseEmbed(
		`Verify ${game_name}#${tag_line}`,
		"Verify your account with your Riot ID"
	);

	tag_line = tag_line.replace("#", "");

	embed.addFields({
		name: "Steps to Verify",
		value:
			"1. Change your summoner icon to the one shown to the right.\n2. Click the verify button below.",
		inline: false,
	});
	embed.addFields({
		name: `Account Requirements`,
		value:
			"\u2022 Account must be level 50.\n\u2022 Account must be at least Gold 4",
		inline: false,
	});

	let verifyIcon = 0;
	await getSummonerByRiotID(game_name, tag_line).then((summoner) => {
		let icon = summoner.profileIconId;
		while (icon === summoner.profileIconId) {
			icon = Math.floor(Math.random() * 29);
		}
		verifyIcon = icon;
	});
	//random between 0 and 28 inclusively

	embed.setThumbnail(
		`http://ddragon.leagueoflegends.com/cdn/13.18.1/img/profileicon/${verifyIcon}.png`
	);

	let customId = `verify_${user_id}_${game_name}_${tag_line}_${verifyIcon}`;
	if (referrer) {
		customId += `_${referrer.id}`;
	}

	const verifyButton = new ButtonBuilder()
		.setCustomId(customId)
		.setLabel("Verify")
		.setStyle(ButtonStyle.Primary);

	const components = new ActionRowBuilder().addComponents(verifyButton);

	console.log(channels.verify);
	const channel = await guild.channels.fetch(channels.verify);
	const message = await channel.send({
		embeds: [embed],
		components: [components],
	});
}

/**
 *
 * @param {bigint} user_id
 * @param {number} level
 * @param {number} awardMoney
 */
async function generateLevelUpEmbed(user_id, level, awardMoney, roleTitle) {
	const guild = await client.guilds.fetch(client.guildID);

	const embed = baseEmbed(
		`Level Up!`,
		`<@${user_id}> has reached level ${level} - ${roleTitle}!`
	);
	if (awardMoney) {
		embed.addFields({
			name: "Level Up Reward",
			value: `You have been awarded ${parseInt(
				Math.floor(awardMoney)
			)} :pound:`,
			inline: false,
		});
	}
	const channel = await guild.channels.fetch(
		channels.games["League of Legends"]
	);

	await channel.send({ embeds: [embed] });
}

async function generateProfileEmbed(interaction, user_id) {
	const user = await User.findByPk(user_id);
	const guild = await client.guilds.fetch(client.guildID);

	const userLevelManager = new UserLevelManager();

	const backgroundImgURL =
		"https://cdn.discordapp.com/attachments/1141595187307614218/1181814548014043218/image.png?ex=65826d91&is=656ff891&hm=537b01db5db24590f38d153a4f00ffe33965ecaa368b340e6d5253776705b7ec&";
	const clubsBackground =
		"https://cdn.discordapp.com/attachments/1141595187307614218/1183821868248072314/SpadeNitroDonorGreen.png?ex=6589bb07&is=65774607&hm=4a20516971e37aeb0df4455b006fd8d20b5c28a1567592a8e9ab8cdac273a332&";
	const response = await fetch(clubsBackground);
	const buffer = await response.buffer();
	const background = await loadImage(buffer);

	const canvas = createCanvas(1300, 365);
	const context = canvas.getContext("2d");

	context.drawImage(background, 0, 0, canvas.width, canvas.height);

	const { level, remainingExp } =
		userLevelManager.calculateLevelAndRemainingExp(user.server_experience);
	console.log("level" + level, remainingExp);
	const maxExp = userLevelManager.expToNextLevel(level);
	drawExperienceBar(context, maxExp - remainingExp, maxExp, 500, 50, level);
	drawNameAndTitle(
		context,
		user.summoner_name,
		userLevelManager.getRoleTitleForProfile(level)
	);

	const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
		name: "profile.png",
	});

	const message = await interaction.reply({
		files: [attachment],
		ephemeral: false,
	});
}

function drawNameAndTitle(ctx, name, title) {
	ctx.font = "bold 55px Arial";
	ctx.fillStyle = "#fff";
	ctx.fillText(name, 450, 100);

	ctx.font = "bold 35px Arial";
	ctx.fillStyle = "#fff";
	ctx.fillText(title, 450, 150);
}

/**
 *
 * @param {Canvas.SKRSContext2D} ctx
 * @param {*} currentExp
 * @param {*} maxExp
 * @param {*} width
 * @param {*} height
 */
function drawExperienceBar(ctx, currentExp, maxExp, width, height, level) {
	// Calculate the width of the filled part
	const filledWidth = (currentExp / maxExp) * width;

	const x = 450;
	const y = 250;
	const offset = 5;

	// Draw the background of the experience bar
	ctx.fillStyle = "#000"; // Background color (black)
	ctx.fillRect(x, y, width, height);

	// // Draw the empty part of the experience bar (neon border color)
	// ctx.fillStyle = "#d32886"; // Neon border color
	// ctx.fillRect(5, 5, width - 10, height - 10);

	// Draw the filled part of the experience bar (neon fill color)
	ctx.fillStyle = "#fe3646"; // Neon fill color
	ctx.fillRect(x + offset, y + offset, filledWidth - 10, height - 10);

	// Optionally add a stroke around the experience bar
	ctx.strokeStyle = "#d32886"; // Stroke color (neon pink)
	ctx.lineWidth = 2; // Stroke width
	ctx.strokeRect(x, y, width, height);

	const fontSize = 30;
	ctx.font = `bold ${fontSize}px Arial`;
	ctx.fillStyle = "#fff";
	ctx.fillText(`Level: ${level}`, x, y - offset);
}

module.exports = {
	generateVerifyEmbed,
	generateLevelUpEmbed,
	generateProfileEmbed,
};
