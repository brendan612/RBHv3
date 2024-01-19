const {
	Interaction,
	SlashCommandStringOption,
	ChannelType,
} = require("discord.js");
const {
	sequelize,
	User,
	Lobby,
	Game,
	Season,
	Draft,
	DraftRound,
	Champion,
} = require("../models");
const { Op } = require("sequelize");

/**
 *
 * @param {Interaction} interaction
 * @returns {Promise<Game>}
 */
async function handleGameOption(interaction) {
	const gameName = interaction.options.getString("game") ?? "League of Legends";
	return await Game.findOne({ where: { name: gameName } });
}

/**
 *
 * @param {Interaction} interaction
 * @returns {Promise<Lobby>}
 */
async function handleLobbyOption(interaction, game_id) {
	let flag = false;
	let lobby = null;
	let lobby_id = interaction.options.getInteger("lobby");
	if (!lobby_id) {
		if (
			interaction.channel.type === ChannelType.PublicThread ||
			interaction.channel.type === ChannelType.PrivateThread
		) {
			const draft = await Draft.findOne({
				where: { thread_id: interaction.channelId },
			});
			if (draft) {
				lobby = await Lobby.findOne({ where: { lobby_id: draft.lobby_id } });
				flag = true;
			}
		}
		if (!flag) {
			//get earliest open lobby
			lobby = await Lobby.findOne({
				where: { closed_date: null, game_id: game_id },
				order: [["created_at", "ASC"]],
			});
		}
	} else {
		lobby = await Lobby.findOne({ where: { lobby_id: lobby_id } });
	}

	if (!lobby) {
		console.log("Lobby not found.");
		await interaction.reply({
			content: "Lobby not found.",
			ephemeral: true,
		});
		return null;
	}

	if (!flag) {
		if (lobby.draft_id) {
			const draft = await Draft.findByPk(lobby.draft_id);

			if (draft.thread_id && draft.thread_id != interaction.channelId) {
				if (
					interaction.channel.type === ChannelType.PublicThread ||
					interaction.channel.type === ChannelType.PrivateThread
				) {
					const otherDraftWithThread = await Draft.findOne({
						where: { thread_id: interaction.channelId },
					});

					if (otherDraftWithThread.draft_id != draft.draft_id) {
						await interaction.reply({
							content: `Use <#${draft.thread_id}> to interact with this lobby.`,
							ephemeral: true,
						});

						return;
					}
				}
			}
		}
	}

	return lobby;
}

/**
 *
 * @param {Interaction} interaction
 * @returns {Promise<User>}
 */
async function handleUserOption(interaction, optionName) {
	let user_id = null;
	const target = interaction.options.getUser(optionName);
	if (target) {
		user_id = target.id;
	} else {
		user_id = interaction.member.id;
	}

	return await User.findOne({
		where: { user_id: user_id },
	});
}

/**
 *
 * @param {Interaction} interaction
 * @param {int} game_id
 * @returns {Promise<Season>}
 */
async function handleSeasonOption(interaction, game_id) {
	const val = interaction.options.getString("season");
	if (val == "all") {
		return null;
	}
	const seasonName = interaction.options.getString("season") ?? "current";
	if (seasonName === "current") {
		return await Season.findOne({
			where: {
				game_id: game_id,
				start_date: {
					[Op.lte]: new Date(), // Less than or equal to today
				},
				end_date: {
					[Op.gte]: new Date(), // Greater than or equal to today
				},
			},
			order: [["created_at", "DESC"]],
		});
	}
	return await Season.findOne({ where: { name: seasonName } });
}

/**
 *
 * @param {Interaction} interaction
 * @param {int} draft_id
 * @returns {Promise<Champion>}
 */
async function handleChampionOption(interaction, draft_id) {
	const champion_id = interaction.options.getString("champion");
	const champion = await Champion.findByPk(champion_id);
	if (!champion) {
		await interaction.reply({
			content: "Champion not found.",
			ephemeral: true,
		});
		return null;
	}
	const existing = await DraftRound.findOne({
		where: { draft_id: draft_id, champion_id: champion_id },
	});

	if (existing) {
		await interaction.reply({
			content: "Champion already selected.",
			ephemeral: true,
		});
		return null;
	}

	return champion;
}

module.exports = {
	handleGameOption,
	handleLobbyOption,
	handleUserOption,
	handleSeasonOption,
	handleChampionOption,
};
