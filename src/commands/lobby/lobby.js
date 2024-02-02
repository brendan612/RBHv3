const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
	Lobby,
	Draft,
	DraftRound,
} = require("./index.js");

const DraftService = require("../../dataManager/services/draftService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const ChampionDraftService = require("../../dataManager/services/championDraftService.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");

const { ChannelType } = require("discord.js");

const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("lobby")
		.setDescription("Display lobby")
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const game = await handleGameOption(interaction);
		const lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby) return;

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
						return interaction.reply({
							content: `This lobby is currently being drafted in <#${draft.thread_id}>`,
							ephemeral: true,
						});
					}
				}
			}

			const draftRounds = await DraftRound.findAll({
				where: { draft_id: lobby.draft_id },
			});
			if (draftRounds.length > 0) {
				const championDraftService = new ChampionDraftService(draft);
				await championDraftService.generateChampionDraftEmbed(draft);
			} else {
				const draftDTO = new DraftDTO(draft);
				const playerDraftService = new PlayerDraftService(draft);
				await playerDraftService.generatePlayerDraftEmbed(draftDTO, true);
			}
		} else {
			const lobbyService = new LobbyService(lobby);
			await lobbyService.generateLobbyEmbed(
				await LobbyService.getLobby(lobby.lobby_id),
				true
			);
		}

		await interaction.deleteReply();
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		}
	},
};
