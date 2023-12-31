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
const DraftDTO = require("../DTOs/draftDTO.js");
const { Lobby, User, PlayerDraftRound, Draft } = require("../../models");
const { baseEmbed } = require("../../components/embed.js");
const { inhouse_icon_url, channels } = require("../../../config.json");
const client = require("../../client.js");
const ThreadManager = require("../managers/threadManager.js");

const {
	LeagueRankEmojis,
	LeagueRoleEmojis,
} = require("../../assets/emojis.js");
const LobbyService = require("../services/lobbyService.js");
const DraftService = require("../services/draftService.js");
const PlayerDraftManager = require("../managers/playerDraftManager.js");

/**
 *
 * @param {DraftDTO} DraftDTO
 * @param {boolean} sendMessage
 * @returns {Promise<{Message>}} message
 */
async function generatePlayerDraftEmbed(draft, sendMessage = true) {
	const guild = await client.guilds.fetch(client.guildID);

	const playerDraftManager =
		client.managers.playerDraftManagerFactory.getPlayerDraftManager(
			draft.draft_id
		);

	const captains = playerDraftManager.captains;

	if (captains.length === 0) {
		if (draft.red_captain_id && draft.blue_captain_id) {
			const draftService = new DraftService(draft);
			const lobby = await LobbyService.getLobby(draft.lobby_id);
			playerDraftManager.captains = await draftService.pickCaptains(lobby);
		}
	}

	const lobby = await Lobby.findOne({
		where: { lobby_id: draft.lobby_id },
		include: [User],
	});

	const host = await guild.members.fetch(lobby.host_id);

	const players = await lobby.Users.slice(0, 10);
	// players = players.filter(
	// 	(user) =>
	// 		user.user_id !== red_captain.user_id &&
	// 		user.user_id !== blue_captain.user_id
	// );

	const embed = baseEmbed(
		`Lobby #${draft.lobby_id} - Player Draft`,
		"Drafting"
	);
	embed
		.setFooter({
			text: `Hosted by ${host.nickname ?? host.user.globalName} • Lobby ID: ${
				lobby.lobby_id
			}`,
			iconURL: host.displayAvatarURL(),
		})
		.setThumbnail(inhouse_icon_url);

	const blue_team = [];
	const red_team = [];

	const playerDraftRounds = await PlayerDraftRound.findAll({
		where: { draft_id: draft.draft_id },
		include: [User],
		order: [["round_number", "ASC"]],
	});

	if (playerDraftRounds.length === 0) {
		//generate side picking buttons

		const lowestCaptain = captains.sort(
			(a, b) => a.elo_rating - b.elo_rating
		)[0].user_id;

		embed.setDescription(`<@${lowestCaptain}> **is picking sides...**`);

		embed.addFields({
			name: "Lobby Players",
			value: await generateRemainingPlayersList(players),
			inline: true,
		});

		const components = generateSideSelectionButtons(draft);
		//const components = generatePlayerDraftComponents(players);
		const message = await sendEmbedMessage(lobby, draft, embed, components);
		return message;
	}

	let availablePlayers = [...players];

	for (const playerDraftRound of playerDraftRounds) {
		availablePlayers = availablePlayers.filter(
			(player) => player.user_id !== playerDraftRound.user_id
		);
		if (playerDraftRound.team === "blue") {
			blue_team.push(playerDraftRound.User);
		} else {
			red_team.push(playerDraftRound.User);
		}
	}

	if (availablePlayers.length > 0) {
		const maxPicks = playerDraftManager.maxPicks();
		if (playerDraftManager.currentTeam === "blue") {
			embed.setDescription(
				`<@${
					playerDraftManager.blue_captain.user_id
				}> **is picking ${maxPicks} player${maxPicks > 1 ? "s" : ""}**`
			);
		} else {
			embed.setDescription(
				`<@${
					playerDraftManager.red_captain.user_id
				}> **is picking ${maxPicks} player${maxPicks > 1 ? "s" : ""}**`
			);
		}
	} else {
		embed.setDescription(
			`**All players have been drafted. Host can now begin Champ Draft**`
		);
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

	if (availablePlayers.length > 0) {
		const components = await generatePlayerDraftComponents(
			availablePlayers,
			draft.draft_id
		);

		await sendEmbedMessage(lobby, draft, embed, components);
	} else {
		const components = generateChampionDraftComponents(draft.draft_id);
		await sendEmbedMessage(lobby, draft, embed, components);
	}
}

async function generateTeamPlayerList(players) {
	const ranks = await PlayerDraftManager.getRanks(players);
	const combinedList = players
		.map((player, index) => {
			// Pad the player name to have equal length
			const paddedName = player.summoner_name.padEnd(32, "\u0020");
			const emojis =
				`${LeagueRoleEmojis[player.primary_role]}${
					LeagueRankEmojis[ranks.get(BigInt(player.user_id)).toUpperCase()]
				}` || "";
			// Return the combined string, padded as necessary
			//prettier-ignore
			return `${(index + 1 < 10 ? `0${index + 1}` : index + 1)
				.toString()
				.padStart(2, " ")}. ${emojis} ${paddedName}`;
		})
		.join("\n");

	if (combinedList === "") {
		return ">>> \u0020";
	}
	return ">>> " + combinedList;
}

async function generateRemainingPlayersList(players) {
	const ranks = await PlayerDraftManager.getRanks(players);
	const combinedList = players
		.map((player, index) => {
			// Pad the player name to have equal length
			const paddedName = player.summoner_name.padEnd(32, "\u0020");
			const emojis =
				`${LeagueRoleEmojis[player.primary_role]}${
					LeagueRankEmojis[ranks.get(BigInt(player.user_id)).toUpperCase()]
				}` || "";
			// Return the combined string, padded as necessary
			//prettier-ignore
			return `${(index + 1 < 10 ? `0${index + 1}` : index + 1)
				.toString()
				.padStart(2, " ")}. ${emojis} ${paddedName}`;
		})
		.join("\n");

	return ">>> " + combinedList;
}

async function generatePlayerDraftComponents(players, draft_id) {
	const playerDraftManager =
		client.managers.playerDraftManagerFactory.getPlayerDraftManager(draft_id);
	const ranks = await PlayerDraftManager.getRanks(players);
	const select = new StringSelectMenuBuilder()
		.setCustomId(`player_draft_${draft_id}`)
		.setPlaceholder("Select a player")
		.setMinValues(playerDraftManager.maxPicks())
		.setMaxValues(playerDraftManager.maxPicks());

	for (const player of players) {
		select.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(player.summoner_name)
				.setDescription(
					`${player.primary_role} | ${ranks
						.get(BigInt(player.user_id))
						.toUpperCase()}`
				)
				.setValue(player.user_id.toString())
		);
	}

	const url =
		"https://www.op.gg/multisearch/na?summoners=" +
		players
			.map((user) =>
				encodeURIComponent(`${user.summoner_name}#${user.tag_line}`)
			)
			.join("%2C");
	const multiGGButton = new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel("OP.GG")
		.setURL(url);

	const actionRow = new ActionRowBuilder().addComponents([select]);
	const buttonRow = new ActionRowBuilder().addComponents([multiGGButton]);
	return [actionRow, buttonRow];
}

function generateChampionDraftComponents(draft_id) {
	const start = new ButtonBuilder()
		.setCustomId(`startchampdraft_${draft_id}`)
		.setLabel("Start Champ Select")
		.setStyle(ButtonStyle.Primary);

	const actionRow = new ActionRowBuilder().addComponents([start]);
	return actionRow;
}

/**
 *
 * @param {DraftDTO} draft
 * @returns {ActionRowBuilder}
 */
function generateSideSelectionButtons(draft) {
	const redButton = new ButtonBuilder()
		.setCustomId(`pick_${draft.draft_id}_red`)
		.setLabel("Red")
		.setStyle(ButtonStyle.Danger);

	const blueButton = new ButtonBuilder()
		.setCustomId(`pick_${draft.draft_id}_blue`)
		.setLabel("Blue")
		.setStyle(ButtonStyle.Primary);

	const actionRow = new ActionRowBuilder().addComponents([
		redButton,
		blueButton,
	]);

	return actionRow;
}

async function sendEmbedMessage(lobby, draft, embed, components) {
	const guild = await client.guilds.fetch(client.guildID);
	const channel = await guild.channels.fetch(
		channels.games["League of Legends"]
	);

	const draftManager = client.managers.draftManagerFactory.getDraftManager(
		draft.draft_id
	);

	//prettier-ignore
	const message = await draftManager.sendMessage(draft, channel, "", embed, components);

	const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
	draftService.setThread(message.channelId);
	draftService.setMessage(message.id);

	return message;
}

module.exports = { generatePlayerDraftEmbed };
