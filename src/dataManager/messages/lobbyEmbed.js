const {
	EmbedBuilder,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const LobbyDTO = require("../DTOs/lobbyDTO");
const { User } = require("../../models");
const { baseEmbed } = require("../../components/embed.js");
const {
	inhouse_icon_url,
	channels,
} = require(`../../../${process.env.CONFIG_FILE}`);
const client = require("../../client.js");
const {
	LeagueRankEmojis,
	LeagueRoleEmojis,
} = require("../../assets/emojis.js");

/**
 *
 * @param {LobbyDTO} lobby
 * @param {boolean} sendMessage
 * @returns {Promise<{embed: EmbedBuilder, components: ActionRowBuilder} | Message>} embed and components or message
 */
async function generateLobbyEmbed(lobby, sendMessage = true) {
	return new Promise(async (resolve, reject) => {
		const guild = await client.guilds.fetch(client.guildID);
		const host = await guild.members.fetch(lobby.host_id);
		const embed = baseEmbed(
			lobby.lobby_name,
			lobby.game_name + " In-House Lobby"
		);
		embed
			.setFooter({
				text: `Hosted by ${host.nickname ?? host.user.globalName} • Lobby ID: ${
					lobby.lobby_id
				} • Seasonal Lobby ID: ${lobby.season_lobby_id}`,
				iconURL: host.displayAvatarURL(),
			})
			.setThumbnail(inhouse_icon_url);
		embed.addFields({
			name: `Joined Players (${lobby.players.length}/10)`,
			value: await generatePlayerListForEmbed(lobby.players),
			inline: false,
		});

		if (lobby.reserves.length > 0) {
			embed.addFields({
				name: `Reserves (${lobby.reserves.length}/${lobby.max_reserves})`,
				value: await generatePlayerListForEmbed(lobby.reserves),
				inline: false,
			});
		}

		const components = generateLobbyButtons(lobby);

		if (sendMessage) {
			const channel = await guild.channels.fetch(
				channels.games["League of Legends"]
			);
			const user = await client.users.fetch(lobby.host_id);
			if (lobby.message_id) {
				try {
					//const dmChannel = user.dmChannel || (await user.createDM());
					const message = await channel.messages.fetch(lobby.message_id);
					if (message) {
						await message.delete();
					}
				} catch (err) {}
			}

			const message = await channel.send({
				embeds: [embed],
				components: [components],
			});

			resolve(message);
		}
		resolve({ embed: embed, components: components });
	});
}

/**
 *
 * @param {User[]} players
 * @returns {Promise<string>}
 */
async function generatePlayerListForEmbed(players) {
	if (players.length === 0) return "\u0020";

	const PlayerDraftManager = require("../managers/playerDraftManager.js");
	const ranks = await PlayerDraftManager.getRanks(players);

	const combinedList = players
		.map((player, index) => {
			const riotID = player.summoner_name + "#" + player.tag_line;
			// Pad the player name to have equal length
			const paddedName = riotID.padEnd(32, "\u0020");
			const emojis =
				`${LeagueRoleEmojis[player.primary_role]}${
					LeagueRankEmojis[ranks.get(player.user_id).toUpperCase()]
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

/**
 *
 * @param {LobbyDTO} lobby
 * @returns {ActionRowBuilder}
 */
function generateLobbyButtons(lobby) {
	const joinButton = new ButtonBuilder()
		.setStyle(ButtonStyle.Success)
		.setLabel("Join")
		.setCustomId(`join_${lobby.lobby_id}`);
	const dropButton = new ButtonBuilder()
		.setStyle(ButtonStyle.Danger)
		.setLabel("Drop")
		.setCustomId(`drop_${lobby.lobby_id}`);
	const draftButton = new ButtonBuilder()
		.setStyle(ButtonStyle.Primary)
		.setLabel("Draft")
		.setCustomId(`draft_${lobby.lobby_id}`);

	const components = new ActionRowBuilder();
	if (lobby.joinable) {
		components.addComponents(joinButton);
	}
	if (lobby.droppable) {
		components.addComponents(dropButton);
	}
	if (lobby.draftable) {
		components.addComponents(draftButton);
	}

	return components;
}

module.exports = { generateLobbyEmbed };
