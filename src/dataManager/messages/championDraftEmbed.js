const {
	EmbedBuilder,
	GuildMember,
	Interaction,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	UserSelectMenuBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require("discord.js");
const DraftDTO = require("../DTOs/lobbyDTO");
const {
	Lobby,
	User,
	PlayerDraftRound,
	Draft,
	DraftRound,
	Champion,
	Match,
} = require("../../models");
const { baseEmbed } = require("../../components/embed.js");

const {
	inhouse_icon_url,
	channels,
} = require(`../../../${process.env.CONFIG_FILE}`);
const client = require("../../client.js");
const {
	AttachmentBuilder,
	Client,
	Events,
	GatewayIntentBits,
} = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const Canvas = require("@napi-rs/canvas");
const sharp = require("sharp");
const path = require("path");
const Sequelize = require("sequelize");

const {
	LeagueRankEmojis,
	LeagueRoleEmojis,
} = require("../../assets/emojis.js");
const LobbyService = require("../services/lobbyService.js");
const DraftService = require("../services/draftService.js");
const {
	generateWinInputComponents,
} = require("../../components/embeds/winButtonComponents.js");
const {
	generateTeamPlayerList,
} = require("../../utilities/utility-functions.js");

const headerBarHeight = 150;
const banSectionHeight = 180;
const banSectionWidth = 180;
const pickSectionHeight = 750;
const pickSectionWidth = 350;
const extraInfoHeight = pickSectionWidth;
const extraInfoWidth = pickSectionWidth;
const banPadding = 5;
const pickPadding = 5;
const canvasWidth = pickSectionWidth * 11;
const canvasHeight = headerBarHeight + banSectionHeight + pickSectionHeight;

const banPlaceholderPath = path.join(
	__dirname,
	"../../assets/drafting/ban_placeholder.png"
);

const pickPlaceholderPath = path.join(
	__dirname,
	"../../assets/drafting/pick_placeholder.png"
);

/**
 *
 * @param {Draft} draft
 * @param {boolean} sendMessage
 */
async function generateChampionDraftEmbed(draft, sendMessage = true) {
	const draftManager = client.managers.draftManagerFactory.getDraftManager(
		draft.draft_id
	);

	const guild = await client.guilds.fetch(client.guildID);

	const lobby = await Lobby.findOne({
		where: { lobby_id: draft.lobby_id },
		include: [User],
	});

	const host = await guild.members.fetch(lobby.host_id);

	let embed = baseEmbed("Champion Draft", "Drafting");
	embed
		.setFooter({
			text: `Hosted by ${host.nickname ?? host.user.globalName} • Lobby ID: ${
				lobby.lobby_id
			}`,
			iconURL: host.displayAvatarURL(),
		})
		.setThumbnail(inhouse_icon_url);

	const draftRounds = await DraftRound.findAll({
		where: { draft_id: draft.draft_id },
		order: [["round_number", "ASC"]],
	});

	if (draftRounds.length > 0) {
		draftManager.currentRound = draftRounds.length + 1;
	}

	draftManager.blue_team_bans = [];
	draftManager.red_team_bans = [];
	draftManager.blue_team_picks = [];
	draftManager.red_team_picks = [];

	draftRounds.forEach((round) => {
		if (round.team === "blue") {
			if (round.type === "ban") {
				draftManager.blue_team_bans.push(round.champion_id);
			} else if (round.type === "pick") {
				draftManager.blue_team_picks.push(round.champion_id);
			}
		} else if (round.team === "red") {
			if (round.type === "ban") {
				draftManager.red_team_bans.push(round.champion_id);
			} else if (round.type === "pick") {
				draftManager.red_team_picks.push(round.champion_id);
			}
		}
	});

	const red_captain = await User.findByPk(draft.red_captain_id);
	const blue_captain = await User.findByPk(draft.blue_captain_id);

	const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");

	await generateHeaderBar(
		ctx,
		red_captain.summoner_name,
		blue_captain.summoner_name
	);
	await generateBanSection(
		ctx,
		draftManager.blue_team_bans,
		draftManager.red_team_bans
	);
	await generatePickSection(
		ctx,
		draftManager.blue_team_picks,
		draftManager.red_team_picks
	);
	await generateExtraInfo(ctx);

	const roundInfo = draftManager.roundSequence[draftManager.currentRound - 1];
	if (roundInfo) {
		const team = roundInfo.team;
		const roundType = roundInfo.action;

		embed.setColor(team === "blue" ? "#104ee0" : "#a10003");
		if (roundType === "ban") {
			embed.setDescription(
				`${team.toUpperCase()} TEAM BAN PHASE\n\n${
					team === "blue" ? "Blue" : "Red"
				} team, it is your turn to ban a champion.`
			);

			embed.addFields({
				name: "Use this command to ban a champion:",
				value: "```/banchamp <champion name>```",
			});
		} else if (roundType === "pick") {
			embed.setDescription(
				`${team.toUpperCase()} TEAM PICK PHASE\n\n${
					team === "blue" ? "Blue" : "Red"
				} team, it is your turn to pick a champion.`
			);
			embed.addFields({
				name: "Use this command to pick a champion:",
				value: "```/pickchamp <champion name>```",
			});
		}
	} else {
		const blue_team = [];
		const red_team = [];

		const playerDraftRounds = await PlayerDraftRound.findAll({
			where: { draft_id: draft.draft_id },
			include: [User],
			order: [["round_number", "ASC"]],
		});

		for (const playerDraftRound of playerDraftRounds) {
			if (playerDraftRound.team === "blue") {
				blue_team.push(playerDraftRound.User);
			} else {
				red_team.push(playerDraftRound.User);
			}
		}

		draftManager.drafted = true;

		const match = await Match.findOne({
			where: { draft_id: draft.draft_id },
		});

		if (match && match.winning_team) {
			draftManager.matchOver = true;
			embed.setTitle("Match Results");
			if (match.winning_team === "blue") {
				embed.setColor("#104ee0");

				embed.setDescription("Blue Team has won the match!");
			} else {
				embed.setColor("#a10003");
				embed.setDescription("Red Team has won the match!");
			}
		} else {
			embed.setDescription("Drafting has concluded.\n\nGood luck, have fun!");
		}
		embed.addFields({
			name: "Blue Team",
			value: await generateTeamPlayerList(blue_team),
			inline: false,
		});

		embed.addFields({
			name: "Red Team",
			value: await generateTeamPlayerList(red_team),
			inline: false,
		});
	} //draft is over

	const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
		name: "champdraft.png",
	});

	if (draftManager.drafted && !draftManager.matchOver) {
		const actionRow = await generateWinInputComponents(draft);
		await sendEmbedMessage(lobby, draft, embed, actionRow, attachment);
	} else {
		await sendEmbedMessage(lobby, draft, embed, null, attachment);
	}
}

/**
 *
 * @param {Canvas.SKRSContext2D} ctx
 * @param {*} red_captain
 * @param {*} blue_captain
 */
async function generateHeaderBar(ctx, red_captain, blue_captain) {
	const fontSize = 75;
	ctx.font = `bold ${fontSize}px Arial`;

	const redTeamText = `Team ${red_captain}`;
	const blueTeamText = `Team ${blue_captain}`;
	const redTeamTextMetrics = ctx.measureText(redTeamText);
	const blueTeamTextMetrics = ctx.measureText(blueTeamText);

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, pickSectionWidth * 11, headerBarHeight); //black bar

	ctx.fillStyle = "#104ee0";
	ctx.fillText(
		blueTeamText,
		(pickSectionWidth * 5) / 2 - blueTeamTextMetrics.width / 2,
		headerBarHeight / 2 + fontSize / 2
	);

	ctx.fillStyle = "#a10003";
	ctx.fillText(
		redTeamText,
		pickSectionWidth * 6 +
			(pickSectionWidth * 5) / 2 -
			redTeamTextMetrics.width / 2,
		headerBarHeight / 2 + fontSize / 2
	);
}

async function generateBanSection(ctx, blue_bans, red_bans) {
	const ban_placeholder = await prepareImage(
		banPlaceholderPath,
		banSectionWidth,
		banSectionHeight
	);

	let blue_champ_splashes = [];
	let red_champ_splashes = [];
	if (blue_bans) {
		blue_champs = await Champion.findAll({
			where: { champion_id: blue_bans },
		});
		blue_champ_splashes = blue_bans.map((banId) =>
			blue_champs.find((champ) => champ.champion_id === banId)
		);
	}

	if (red_bans) {
		red_champs = await Champion.findAll({
			where: { champion_id: red_bans },
		});
		red_champ_splashes = red_bans.map((banId) =>
			red_champs.find((champ) => champ.champion_id === banId)
		);
	}

	let index = 0;
	let xPosition = 0;

	for (let i = 0; i < 5; i++) {
		xPosition = index++ * banSectionWidth;

		const champ = blue_champ_splashes[i];
		if (!champ) {
			ctx.drawImage(
				ban_placeholder,
				xPosition + banPadding,
				headerBarHeight + banPadding
			);
			// ctx.fillStyle = "#000";
			// ctx.fillRect(
			// 	xPosition,
			// 	headerBarHeight,
			// 	banSectionWidth,
			// 	banSectionWidth
			// );
			// ctx.fillStyle = "#ccc";
			// ctx.fillRect(
			// 	xPosition + banPadding,
			// 	headerBarHeight + banPadding,
			// 	banSectionWidth - banPadding,
			// 	banSectionHeight - banPadding
			// );
		} else {
			const image = await loadImage(champ.square_icon);
			ctx.drawImage(
				image,
				xPosition,
				headerBarHeight,
				banSectionWidth,
				banSectionHeight
			);
		}
	}

	index = 0;
	redTeamStartX = pickSectionWidth * 11 - banSectionWidth * 5; //right justify the red bans

	for (let i = 0; i < 5; i++) {
		xPosition = index++ * banSectionWidth + redTeamStartX;
		const champ = red_champ_splashes[i];
		if (!champ) {
			ctx.drawImage(
				ban_placeholder,
				xPosition + banPadding,
				headerBarHeight + banPadding
			);
			// ctx.fillStyle = "#000";
			// ctx.fillRect(
			// 	xPosition,
			// 	headerBarHeight,
			// 	banSectionWidth,
			// 	banSectionWidth
			// );
			// ctx.fillStyle = "#ccc";
			// ctx.fillRect(
			// 	xPosition + banPadding,
			// 	headerBarHeight + banPadding,
			// 	banSectionWidth - banPadding,
			// 	banSectionHeight - banPadding
			// );
		} else {
			const image = await loadImage(champ.square_icon);
			ctx.drawImage(
				image,
				xPosition,
				headerBarHeight,
				banSectionWidth,
				banSectionHeight
			);
		}
	}
}

/**
 *
 * @param {Canvas.SKRSContext2D} ctx
 * @param {*} blue_picks
 * @param {*} red_picks
 */
async function generatePickSection(ctx, blue_picks, red_picks) {
	const pick_placeholder = await prepareImage(
		pickPlaceholderPath,
		pickSectionWidth,
		pickSectionHeight
	);

	let blue_champ_splashes = [];
	let red_champ_splashes = [];
	if (blue_picks) {
		blue_champs = await Champion.findAll({
			where: { champion_id: blue_picks },
		});
		blue_champ_splashes = blue_picks.map((banId) =>
			blue_champs.find((champ) => champ.champion_id === banId)
		);
	}

	if (red_picks) {
		red_champs = await Champion.findAll({
			where: { champion_id: red_picks },
		});
		red_champ_splashes = red_picks.map((banId) =>
			red_champs.find((champ) => champ.champion_id === banId)
		);
	}

	let index = 0;
	let xPosition = 0;

	for (let i = 0; i < 5; i++) {
		xPosition = index++ * pickSectionWidth;

		const champ = blue_champ_splashes[i];
		if (!champ) {
			ctx.drawImage(
				pick_placeholder,
				xPosition,
				headerBarHeight + banSectionHeight,
				pickSectionWidth,
				pickSectionHeight
			);
		} else {
			const image = await loadImage(champ.loading_splash);
			ctx.drawImage(
				image,
				xPosition,
				headerBarHeight + banSectionHeight,
				pickSectionWidth,
				pickSectionHeight
			);
		}
	}

	index = 6;

	for (let i = 0; i < 5; i++) {
		xPosition = index++ * pickSectionWidth;

		const champ = red_champ_splashes[i];
		if (!champ) {
			ctx.drawImage(
				pick_placeholder,
				xPosition,
				headerBarHeight + banSectionHeight,
				pickSectionWidth,
				pickSectionHeight
			);
		} else {
			const image = await loadImage(champ.loading_splash);
			ctx.drawImage(
				image,
				xPosition,
				headerBarHeight + banSectionHeight,
				pickSectionWidth,
				pickSectionHeight
			);
		}
	}
}

async function generateExtraInfo(ctx) {
	const logoURL = "https://imgur.com/ug9dvEg.png";
	const logo = await loadImage(logoURL);

	ctx.drawImage(
		logo,
		pickSectionWidth * 5,
		headerBarHeight,
		extraInfoHeight,
		extraInfoWidth
	);
}

async function sendEmbedMessage(lobby, draft, embed, components, files) {
	const guild = await client.guilds.fetch(client.guildID);
	const channel = await guild.channels.fetch(
		channels.games["League of Legends"]
	);

	const draftManager = client.managers.draftManagerFactory.getDraftManager(
		draft.draft_id
	);

	//prettier-ignore
	const message = await draftManager.sendMessage(draft, channel, "", embed, components, files);

	const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
	draftService.setThread(message.channelId);
	draftService.setMessage(message.id);

	return message;
}

/**
 *
 * @param {string} imagePath
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Canvas.Image>}
 */
async function prepareImage(imagePath, width, height) {
	const resizedImage = await sharp(imagePath).resize(width, height).toBuffer();
	const img = await loadImage(resizedImage);
	return img;
}

module.exports = { generateChampionDraftEmbed };
