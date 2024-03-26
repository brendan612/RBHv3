const client = require("../../client.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const { Match, Lobby, MatchPlayer, User } = require("../../models/index.js");
const { AttachmentBuilder } = require("discord.js");

const { channels } = require(`../../../${process.env.CONFIG_FILE}`);

const canvasWidth = 1920;
const canvasHeight = 1080;

/**
 *
 * @param {Match} match
 * @returns
 */
async function generateSeasonEndImage() {
	const winningTeam = match.winning_team;

	const canvas = createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");

	ctx.font = "bold 100px Noto Serif KR";

	await drawBackground(ctx, canvasWidth, canvasHeight, winningTeam);

	let matchPlayers = await MatchPlayer.findAll({
		where: {
			match_id: match.match_id,
		},
	});

	await drawMatchDetails(ctx, match);
	await drawPlayers(ctx, matchPlayers, winningTeam);

	const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
		name: "profile.png",
	});

	const guild = await client.guilds.fetch(client.guildID);
	const channel = await guild.channels.fetch(channels.wins);

	const message = await channel.send({
		files: [attachment],
	});
}

async function drawBackground(ctx, width, height, winningTeam) {
	const backgroundImagePath = path.join(
		__dirname,
		`../../assets/postgame/${winningTeam}_win.png`
	);
	const backgroundImage = await loadImage(backgroundImagePath);

	ctx.drawImage(backgroundImage, 0, 0, width, height);
}

async function drawMatchDetails(ctx, match) {
	const lobby = await Lobby.findByPk(match.lobby_id);
	const user = await User.findByPk(lobby.host_id);

	const lobbyNameMetrics = ctx.measureText(lobby.lobby_name);
	ctx.fillStyle = "#fff";
	ctx.fillText(
		lobby.lobby_name,
		canvasWidth / 2 - lobbyNameMetrics.width / 2,
		100
	);

	const matchDate = new Date(match.start_time);

	const matchDateText = `${
		matchDate.getMonth() + 1
	}/${matchDate.getDate()}/${matchDate.getFullYear()}`;

	ctx.font = "bold 50px Noto Serif KR";
	ctx.fillText(matchDateText, 10, 50);

	const lobby_id = `#${match.lobby_id}`;

	const lobby_idMetrics = ctx.measureText(lobby_id);
	ctx.fillText(lobby_id, canvasWidth - lobby_idMetrics.width - 10, 50);

	const hostName = `Hosted by: ${user.summoner_name}#${user.tag_line}`;
	const hostNameMetrics = ctx.measureText(hostName);

	ctx.fillText(
		hostName,
		canvasWidth - hostNameMetrics.width - 10,
		canvasHeight - 10
	);
}
async function drawPlayers(ctx, players, winningTeam) {
	const blueTeam = players.filter((p) => p.team === "blue");
	const redTeam = players.filter((p) => p.team === "red");

	const blueTeamY = 150;
	const redTeamY = 650;

	const blueTeamX = 50;
	const redTeamX = 50;

	const blueTeamSpacing = 75;
	const redTeamSpacing = 75;

	const blueTeamStartX = blueTeamX + blueTeamSpacing;
	const redTeamStartX = redTeamX + redTeamSpacing;

	const blueTeamStartY = blueTeamY + blueTeamSpacing;
	const redTeamStartY = redTeamY + redTeamSpacing;

	ctx.font = "bold 75px Noto Serif KR";

	const longestPlayerName = await findLongestPlayerName(ctx, players);

	const strokeStyle = "#000";
	const lineWidth = 1;

	for (let i = 0; i < 5; i++) {
		const player = blueTeam[i];
		const user = await User.findByPk(player.user_id);

		let playerEloChange = player.elo_change;
		if (playerEloChange > 0) {
			playerEloChange = "+" + playerEloChange;
		} else {
			playerEloChange = playerEloChange.toString();
		}

		ctx.strokeStyle = strokeStyle;
		ctx.lineWidth = lineWidth;
		ctx.strokeText(
			user.summoner_name + "#" + user.tag_line,
			blueTeamStartX,
			blueTeamStartY + i * blueTeamSpacing
		);

		ctx.fillStyle = "#104ee0";
		ctx.fillText(
			user.summoner_name + "#" + user.tag_line,
			blueTeamStartX,
			blueTeamStartY + i * blueTeamSpacing
		);

		ctx.strokeStyle = strokeStyle;
		ctx.lineWidth = lineWidth;
		ctx.strokeText(
			playerEloChange,
			blueTeamStartX + longestPlayerName + 100,
			blueTeamStartY + i * blueTeamSpacing
		);

		ctx.fillStyle = winningTeam === "blue" ? "#57de5b" : "#a10003";
		ctx.fillText(
			playerEloChange,
			blueTeamStartX + longestPlayerName + 100,
			blueTeamStartY + i * blueTeamSpacing
		);

		blueTeamStartY + i * blueTeamSpacing;
	}

	for (let i = 0; i < 5; i++) {
		const player = redTeam[i];
		const user = await User.findByPk(player.user_id);

		let playerEloChange = player.elo_change;
		if (playerEloChange > 0) {
			playerEloChange = "+" + playerEloChange;
		} else {
			playerEloChange = playerEloChange.toString();
		}

		ctx.strokeStyle = strokeStyle;
		ctx.lineWidth = lineWidth;
		ctx.strokeText(
			user.summoner_name + "#" + user.tag_line,
			redTeamStartX,
			redTeamStartY + i * redTeamSpacing
		);

		ctx.fillStyle = "#e01010";
		ctx.fillText(
			user.summoner_name + "#" + user.tag_line,
			redTeamStartX,
			redTeamStartY + i * redTeamSpacing
		);

		ctx.strokeStyle = strokeStyle;
		ctx.lineWidth = lineWidth;
		ctx.strokeText(
			playerEloChange,
			redTeamStartX + longestPlayerName + 100,
			redTeamStartY + i * redTeamSpacing
		);

		ctx.fillStyle = winningTeam === "red" ? "#57de5b" : "#a10003";
		ctx.fillText(
			playerEloChange,
			redTeamStartX + longestPlayerName + 100,
			redTeamStartY + i * redTeamSpacing
		);

		redTeamStartY + i * redTeamSpacing;
	}
}

async function findLongestPlayerName(ctx, players) {
	let longestWidth = 0;
	let longestName = "";

	for (const curr of players) {
		const user = await User.findByPk(curr.user_id);
		const name = user.summoner_name + "#" + user.tag_line;
		const metrics = ctx.measureText(name);

		if (metrics.width > longestWidth) {
			longestWidth = metrics.width;
			longestName = name; // keep track of the longest name
		}
	}

	return longestWidth; // or return { longestName, longestWidth } if you need the name too
}

module.exports = { generatePostGameImage };
