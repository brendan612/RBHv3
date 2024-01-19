const { User, Season } = require("../../models");
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
const UserService = require("../services/userService.js");
const path = require("path");
const { getStatsForUser } = require("../queries/stats/stats.js");

const userLevelManager = new UserLevelManager();

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

	const UserService = require("../services/userService.js");
	const userService = await UserService.createUserService(user_id);

	const { level, remainingExp } =
		userLevelManager.calculateLevelAndRemainingExp(user.server_experience);

	const donorRole = await userService.getDonorRole(user_id);
	const isBooster = true; //await userService.isBooster(user_id);

	const currentSeason = await Season.getCurrentSeason(1);
	const stats = await getStatsForUser(user.user_id, currentSeason.season_id);

	if (!donorRole && !isBooster) {
		const embed = await generateBasicEmbed(
			user,
			userLevelManager.expForNextLevel(level),
			remainingExp,
			stats.wins,
			stats.losses
		);

		const message = await interaction.reply({
			embeds: [embed],
			ephemeral: false,
		});
	} else {
		const title = userLevelManager.getRoleTitleForProfile(level);

		const canvas = createCanvas(1300, 365);
		const context = canvas.getContext("2d");

		const background = await drawBackgroundImage(
			context,
			canvas,
			donorRole,
			isBooster,
			level
		);

		drawNameAndTitle(context, user.summoner_name, title);

		drawWinLoss(context, stats.wins, stats.losses);

		const maxExp = userLevelManager.expForNextLevel(level);
		drawExperienceBar(context, maxExp - remainingExp, maxExp, 300, 50, level);

		const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
			name: "profile.png",
		});

		const message = await interaction.reply({
			files: [attachment],
			ephemeral: false,
		});
	}
}

function drawNameAndTitle(ctx, name, title) {
	ctx.font = "bold 55px Arial";

	ctx.strokeStyle = "#000";
	ctx.lineWidth = 3;
	ctx.strokeText(name, 400, 100);

	ctx.fillStyle = "#fff";
	ctx.fillText(name, 400, 100);

	ctx.font = "bold 35px Arial";

	ctx.strokeStyle = "#000";
	ctx.lineWidth = 3;

	ctx.strokeText(title, 400, 150);
	ctx.fillText(title, 400, 150);
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

	const x = 400;
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

	ctx.strokeStyle = "#000";
	ctx.lineWidth = 3;
	ctx.strokeText(`Level: ${level}`, x, y - offset);

	ctx.fillStyle = "#fff";
	ctx.fillText(`Level: ${level}`, x, y - offset);
}

function drawWinLoss(ctx, wins, losses) {
	const x = 800;
	const y = 250;
	const offset = 5;

	ctx.font = "bold 30px Arial";

	ctx.strokeStyle = "#000";
	ctx.lineWidth = 3;
	ctx.strokeText(`Wins: ${wins}`, x, y);
	ctx.strokeText(`Losses: ${losses}`, x, y + 50);

	ctx.fillStyle = "#fff";
	ctx.fillText(`Wins: ${wins}`, x, y);
	ctx.fillText(`Losses: ${losses}`, x, y + 50);
}

/**
 *
 * @param {Canvas.SKRSContext2D} ctx
 * @param {Canvas} canvas
 * @param {string} donorRole
 * @param {boolean} isBooster
 */
async function drawBackgroundImage(ctx, canvas, donorRole, isBooster, level) {
	const { suitNumber, suitName, cardNumber } =
		userLevelManager.getSuitNumberNameAndCardNumber(level);

	const backgroundImagePath = path.join(
		__dirname,
		`../../assets/profiles/${suitName}.png`
	);
	const backgroundImage = await loadImage(backgroundImagePath);

	ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

	let banner = "";
	if (isBooster) {
		banner += "booster_";
	}

	if (donorRole) {
		banner += donorRole.toLowerCase();
	}

	banner = banner.replace(/_+$/, "");
	if (banner) {
		const bannerImagePath = path.join(
			__dirname,
			`../../assets/profiles/${banner}.png`
		);
		const bannerImage = await loadImage(bannerImagePath);
		ctx.drawImage(bannerImage, 0, 0, canvas.width, canvas.height);
	}
}

async function generateBasicEmbed(user, exp, remainingExp, wins, losses) {
	const guild = await client.guilds.fetch(client.guildID);
	const member = await guild.members.fetch(user.user_id);

	const embed = baseEmbed(
		`${user.summoner_name}#${user.tag_line}`,
		"Server Profile"
	);

	console.log(remainingExp, exp);

	embed.addFields(
		{
			name: "Level",
			value: user.server_level.toString(),
			inline: true,
		},
		{
			name: "Experience",
			value: `${remainingExp}/${exp}`,
			inline: true,
		},
		{
			name: "Win/Loss (Season)",
			value: wins + "/" + losses,
			inline: true,
		}
	);

	embed.setThumbnail(member.user.displayAvatarURL());

	return embed;
}

module.exports = {
	generateVerifyEmbed,
	generateLevelUpEmbed,
	generateProfileEmbed,
};
