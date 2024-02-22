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
const { prepareImage } = require("../../utilities/utility-functions.js");

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
const { generateOPGGButton } = require("../../components/buttons.js");
const { name } = require("../../events/interactionCreate.js");

const headerBarHeight = 150;
const banSectionHeight = 180;
const banSectionWidth = 180;
const namePlateHeight = 50;
const namePlateWidth = 350;
const pickSectionHeight = 750;
const pickSectionWidth = 350;
const extraInfoHeight = pickSectionWidth;
const extraInfoWidth = pickSectionWidth;
const banPadding = 5;
const pickPadding = 5;
const canvasWidth = pickSectionWidth * 11;
const canvasHeight =
	headerBarHeight + banSectionHeight + namePlateHeight + pickSectionHeight;

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

	const blue_team = [];
	const red_team = [];

	const playerDraftRounds = await PlayerDraftRound.findAll({
		where: { draft_id: draft.draft_id },
		include: [User],
		order: [["round_number", "ASC"]],
	});
	playerDraftRounds.sort((a, b) => a.round_number - b.round_number);

	for (const playerDraftRound of playerDraftRounds) {
		if (playerDraftRound.team === "blue") {
			blue_team.push(playerDraftRound.User);
		} else {
			red_team.push(playerDraftRound.User);
		}
	}

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

	const roundInfo = draftManager.roundSequence[draftManager.currentRound - 1];

	const red_captain = await User.findByPk(draft.red_captain_id);
	const blue_captain = await User.findByPk(draft.blue_captain_id);

	const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	if (roundInfo) {
		if (roundInfo.team === "blue") {
			ctx.fillStyle = "#104ee0";
			ctx.fillRect(
				0,
				0,
				pickSectionWidth * 5 + pickSectionWidth / 2,
				canvasHeight
			);
		} else {
			ctx.fillStyle = "#a10003";
			ctx.fillRect(
				pickSectionWidth * 6 - pickSectionWidth / 2,
				0,
				pickSectionWidth * 5 + pickSectionWidth / 2,
				canvasHeight
			);
		}
	}

	await generateHeaderBar(
		ctx,
		red_captain.summoner_name,
		blue_captain.summoner_name
	);

	await generateBanSection(
		ctx,
		draftManager.blue_team_bans,
		draftManager.red_team_bans,
		lobby.lobby_id
	);

	//await generateNamePlateSection(ctx, blue_team, red_team);

	await generatePickSection(
		ctx,
		draftManager.blue_team_picks,
		draftManager.red_team_picks,
		lobby.lobby_id
	);
	await generateExtraInfo(ctx);

	if (roundInfo) {
		const team = roundInfo.team;
		const roundType = roundInfo.action;

		embed.setColor(team === "blue" ? "#104ee0" : "#a10003");
		if (roundType === "ban") {
			embed.setDescription(
				`${team.toUpperCase()} TEAM BAN PHASE\n${
					team === "blue"
						? `<@${blue_captain.user_id}>`
						: `<@${red_captain.user_id}>`
				}, it is your team's turn to ban a champion.`
			);

			embed.addFields({
				name: "Use this command to ban a champion:",
				value: "```/banchamp <champion name>```",
			});
		} else if (roundType === "pick") {
			embed.setDescription(
				`${team.toUpperCase()} TEAM PICK PHASE\n${
					team === "blue"
						? `<@${blue_captain.user_id}>`
						: `<@${red_captain.user_id}>`
				}, it is your team's turn to pick a champion.`
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
	} //draft is over

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

	const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
		name: "champdraft.png",
	});

	if (sendMessage) {
		if (draftManager.drafted && !draftManager.matchOver) {
			const actionRow = await generateWinInputComponents(draft);
			await sendEmbedMessage(lobby, draft, embed, actionRow, attachment);
		} else {
			const row = await generateComponents(blue_team, red_team);
			await sendEmbedMessage(lobby, draft, embed, row, attachment);
		}
	}
}

async function generateComponents(blue_team, red_team) {
	const blueTeamOPGG = generateOPGGButton(blue_team, "Blue Team OP.GG");
	const redTeamOPGG = generateOPGGButton(red_team, "Red Team OP.GG");
	const opggRow = new ActionRowBuilder().addComponents([
		blueTeamOPGG,
		redTeamOPGG,
	]);
	return opggRow;
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

async function generateBanSection(ctx, blue_bans, red_bans, lobby_id) {
	let ban_placeholder = client.cache.get("ban_placeholder");
	if (!ban_placeholder) {
		ban_placeholder = await prepareImage(
			banPlaceholderPath,
			banSectionWidth,
			banSectionHeight
		);
		client.cache.set("ban_placeholder", ban_placeholder);
	}

	if (blue_bans.length < 5) {
		blue_bans = blue_bans.concat(Array(5 - blue_bans.length).fill(null));
	}

	if (red_bans.length < 5) {
		red_bans = red_bans.concat(Array(5 - red_bans.length).fill(null));
	}

	const blueBanImages = await Promise.all(
		blue_bans.map(async (champId) => {
			if (champId === null) return ban_placeholder;

			let square_icon = client.cache.get(
				`champ_${champId}_square_icon`,
				"lobby_id_" + lobby_id
			);

			if (!square_icon) {
				const champ = await Champion.findByPk(champId);
				square_icon = await loadImage(champ.square_icon);
				client.cache.set(
					`champ_${champId}_square_icon`,
					square_icon,
					"lobby_id_" + lobby_id
				);
			}

			return square_icon;
		})
	);

	const redBanImages = await Promise.all(
		red_bans.map(async (champId) => {
			if (champId === null) return ban_placeholder;

			let square_icon = client.cache.get(
				`champ_${champId}_square_icon`,
				"lobby_id_" + lobby_id
			);

			if (!square_icon) {
				const champ = await Champion.findByPk(champId);
				square_icon = await loadImage(champ.square_icon);
				client.cache.set(
					`champ_${champId}_square_icon`,
					square_icon,
					"lobby_id_" + lobby_id
				);
			}

			return square_icon;
		})
	);

	blueBanImages.forEach((image, index) => {
		const xPosition =
			index * banSectionWidth + (image === ban_placeholder ? banPadding : 0);

		ctx.drawImage(
			image,
			xPosition,
			headerBarHeight,
			banSectionWidth,
			banSectionHeight
		);
	});

	const redTeamStartX = pickSectionWidth * 11 - banSectionWidth * 5;

	redBanImages.forEach((image, index) => {
		const xPosition =
			redTeamStartX +
			index * banSectionWidth +
			(image === ban_placeholder ? banPadding : 0);

		ctx.drawImage(
			image,
			xPosition,
			headerBarHeight,
			banSectionWidth,
			banSectionHeight
		);
	});
}

async function generateNamePlateSection(ctx, blue_team, red_team) {
	let fontSize = 50;
	ctx.font = `bold ${fontSize}px Arial`;

	ctx.fillStyle = "#104ee0";

	for (let i = 0; i < 5; i++) {
		const user = blue_team[i];
		if (user) {
			const name = user.summoner_name + "#" + user.tag_line;
			let nameMetrics = ctx.measureText(name);
			while (nameMetrics.width > namePlateWidth - 10) {
				fontSize -= 5;
				ctx.font = `bold ${fontSize}px Arial`;
				nameMetrics = ctx.measureText(name);
			}
			const centerOfNamePlate = i * namePlateWidth + namePlateWidth / 2;
			const halfOfName = nameMetrics.width / 2;
			const xPosition = centerOfNamePlate - halfOfName;
			//prettier-ignore
			ctx.fillText(
				name, 
				xPosition,
				headerBarHeight + banSectionHeight + (namePlateHeight / 2 + fontSize / 2)
			);
		}
	}

	fontSize = 50;
	ctx.font = `bold ${fontSize}px Arial`;
	ctx.fillStyle = "#a10003";

	for (let i = 0; i < 5; i++) {
		const user = red_team[i];
		if (user) {
			const name = user.summoner_name + "#" + user.tag_line;
			let nameMetrics = ctx.measureText(name);
			while (nameMetrics.width > namePlateWidth - 10) {
				fontSize -= 5;
				ctx.font = `bold ${fontSize}px Arial`;
				nameMetrics = ctx.measureText(name);
			}
			const centerOfNamePlate = i * namePlateWidth + namePlateWidth / 2;
			const halfOfName = nameMetrics.width / 2;
			const xPosition = centerOfNamePlate - halfOfName + namePlateWidth * 6;
			//prettier-ignore
			ctx.fillText(
				name,
				xPosition,
				headerBarHeight + banSectionHeight + (namePlateHeight / 2 + fontSize / 2)
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
async function generatePickSection(ctx, blue_picks, red_picks, lobby_id) {
	let pick_placeholder = client.cache.get("pick_placeholder");
	if (!pick_placeholder) {
		pick_placeholder = await prepareImage(
			pickPlaceholderPath,
			pickSectionWidth,
			pickSectionHeight
		);
		client.cache.set("pick_placeholder", pick_placeholder);
	}

	if (blue_picks.length < 5) {
		blue_picks = blue_picks.concat(Array(5 - blue_picks.length).fill(null));
	}

	if (red_picks.length < 5) {
		red_picks = red_picks.concat(Array(5 - red_picks.length).fill(null));
	}

	const bluePickImages = await Promise.all(
		blue_picks.map(async (champId) => {
			if (champId === null) return pick_placeholder;

			let loading_splash = client.cache.get(
				`champ_${champId}_square_icon`,
				"lobby_id_" + lobby_id
			);

			if (!loading_splash) {
				const champ = await Champion.findByPk(champId);
				loading_splash = await loadImage(champ.loading_splash);
				client.cache.set(
					`champ_${champId}_loading_splash`,
					loading_splash,
					"lobby_id_" + lobby_id
				);
			}

			return loading_splash;
		})
	);

	const redPickImages = await Promise.all(
		red_picks.map(async (champId) => {
			if (champId === null) return pick_placeholder;

			let loading_splash = client.cache.get(
				`champ_${champId}_square_icon`,
				"lobby_id_" + lobby_id
			);

			if (!loading_splash) {
				const champ = await Champion.findByPk(champId);
				loading_splash = await loadImage(champ.loading_splash);
				client.cache.set(
					`champ_${champId}_loading_splash`,
					loading_splash,
					"lobby_id_" + lobby_id
				);
			}

			return loading_splash;
		})
	);

	bluePickImages.forEach((image, index) => {
		const xPosition = index * pickSectionWidth;

		ctx.drawImage(
			image,
			xPosition,
			headerBarHeight + banSectionHeight + namePlateHeight,
			pickSectionWidth,
			pickSectionHeight
		);
	});

	redPickImages.forEach((image, index) => {
		const xPosition = index * pickSectionWidth + pickSectionWidth * 6;

		ctx.drawImage(
			image,
			xPosition,
			headerBarHeight + banSectionHeight + namePlateHeight,
			pickSectionWidth,
			pickSectionHeight
		);
	});
}

async function generateExtraInfo(ctx) {
	let logo = client.cache.get("inhouse_logo");
	if (!logo) {
		logo = await loadImage("https://imgur.com/ug9dvEg.png");
		client.cache.set("inhouse_logo", logo);
	}

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

	const match = await Match.findByPk(draft.match_id);
	const useThread = match.end_time ? false : true;
	//prettier-ignore
	const message = await draftManager.sendMessage(draft, channel, "", embed, components, files, false, useThread);

	const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
	if (useThread) {
		draftService.setThread(message.channelId);
	}
	draftService.setMessage(message.id);

	return message;
}

module.exports = { generateChampionDraftEmbed };
