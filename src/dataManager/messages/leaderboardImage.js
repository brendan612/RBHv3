const { User } = require("../../models/index.js");

const { AttachmentBuilder } = require("discord.js");
const { createCanvas } = require("@napi-rs/canvas");
const path = require("path");
const { prepareImage } = require("../../utilities/utility-functions.js");

const {
	getLeaderboard,
} = require("../../dataManager/queries/stats/leaderboard.js");

const client = require("../../client.js");
const veteransBackground = path.join(
	__dirname,
	"../../assets/images/leaderboard/leaderboard.jpg"
);

const canvasWidth = 1080;
const canvasHeight = 1920;

const borderOffset = 8;
const textSectionWidth = canvasWidth - 2 * borderOffset;
const textSectionHeight = canvasHeight - 2 * borderOffset;

/**
 *
 * @param {number} offset
 * @param {number} limit
 * @param {Game} game
 * @param {Season} season
 * @param {string} region
 * @returns
 */
async function generateLeaderboardImage(
	offset,
	limit,
	game,
	season,
	region = "NA"
) {
	const cachedLeaderboard = client.cache.get(
		`leaderboard_image-${game.game_id}-${season.season_id}-${region}}-${offset}-${limit}`,
		"leaderboard"
	);

	if (cachedLeaderboard) {
		return cachedLeaderboard;
	}

	let leaderboard = await getLeaderboard(
		game.game_id,
		season?.season_id,
		region,
		3,
		false
	);

	if (!leaderboard) {
		return null;
	}

	leaderboard = leaderboard.slice(offset, offset + limit);

	const canvas = createCanvas(canvasWidth, canvasHeight);
	const ctx = canvas.getContext("2d");
	const background = await prepareImage(
		veteransBackground,
		canvasWidth,
		canvasHeight
	);
	ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);

	ctx.font = "bold 60px Noto Serif KR";

	ctx.fillStyle = "white";

	const title = "Queen's Croquet Leaderboard";
	const titleMetrics = ctx.measureText(title);
	ctx.fillText(
		title,
		(borderOffset + textSectionWidth) / 2 - titleMetrics.width / 2,
		100
	);

	ctx.font = "bold 45px Noto Serif KR";

	const seasonText = season ? season.name : "All Time";
	const seasonMetrics = ctx.measureText(seasonText);

	ctx.fillText(
		seasonText,
		(borderOffset + textSectionWidth) / 2 - seasonMetrics.width / 2,
		155
	);

	ctx.font = "bold 45px Noto Serif KR";

	let maxNameWidth = 0;

	leaderboard.forEach(async (player) => {
		const user = await User.findByPk(player.user_id);

		const name = user.summoner_name + "#" + user.tag_line;
		const nameMetrics = ctx.measureText(name);
		if (nameMetrics.width > maxNameWidth) {
			maxNameWidth = nameMetrics.width;
		}
	});

	const playerYStart = 250;
	const spacing = 75;
	let top3Spacing = 0;
	for (let i = 0; i < leaderboard.length; i++) {
		const player = leaderboard[i];
		const user = await User.findByPk(player.user_id);
		const wins = parseInt(player.wins);
		const losses = parseInt(player.losses);
		const elo = parseInt(player.elo_rating);

		const paddedRank = (player.rank.toString() + ".").padEnd(3, "\u2002");
		const name = `${paddedRank} ` + user.summoner_name + "#" + user.tag_line;

		const winLoss = `${wins}W ${losses}L`;

		if (player.rank === 1) {
			ctx.fillStyle = "#FFD700";
		} else if (player.rank === 2) {
			ctx.fillStyle = "#C0C0C0";
		} else if (player.rank === 3) {
			ctx.fillStyle = "#CD7F32";
		} else {
			ctx.fillStyle = "#FFF";
			top3Spacing = 60;
		}

		ctx.fillText(
			name,
			borderOffset + spacing,
			playerYStart + i * spacing + top3Spacing
		);
		ctx.fillText(
			elo.toString(),
			borderOffset + spacing + maxNameWidth + 100,
			playerYStart + i * spacing + top3Spacing
		);
		ctx.fillText(
			winLoss,
			borderOffset + spacing + maxNameWidth + 200,
			playerYStart + i * spacing + top3Spacing
		);
	}

	const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
		name: "leaderboard.png",
	});

	client.cache.set(
		`leaderboard_image-${game.game_id}-${season.season_id}-${region}-${offset}-${limit}`,
		attachment,
		"leaderboard"
	);

	return attachment;
}

module.exports = { generateLeaderboardImage };
