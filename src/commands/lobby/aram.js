const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	lobbyAutocomplete,
	championAutocomplete,
	gameOption,
	lobbyOption,
	handleGameOption,
	handleLobbyOption,
	Lobby,
	Draft,
	DraftRound,
	PlayerDraftRound,
	Champion,
} = require("./index.js");

const DraftService = require("../../dataManager/services/draftService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const MatchService = require("../../dataManager/services/matchService.js");
const LobbyDTO = require("../../dataManager/DTOs/lobbyDTO.js");
const DraftDTO = require("../../dataManager/DTOs/draftDTO.js");
const ChampionDraftService = require("../../dataManager/services/championDraftService.js");
const client = require("../../client.js");
const UserDTO = require("../../dataManager/DTOs/userDTO.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("aram")
		.setDescription("Pick/Ban random champions for a lobby")
		.addStringOption(gameOption())
		.addIntegerOption(lobbyOption())
		.addBooleanOption((option) => {
			return option
				.setName("random-teams")
				.setDescription("Randomize teams")
				.setRequired(false);
		}),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const game = await handleGameOption(interaction);
		let lobby = await handleLobbyOption(interaction, game.game_id);
		if (!lobby) return;
		const lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

		const randomTeams = interaction.options.getBoolean("random-teams");

		if (!lobby.draft_id) {
			return interaction.reply({
				content: "This lobby has not started drafting yet",
				ephemeral: true,
			});
		}

		await interaction.deferReply({ ephemeral: true });

		if (!randomTeams) {
			const playerDraftRounds = await PlayerDraftRound.findAll({
				where: {
					draft_id: lobby.draft_id,
				},
			});

			if (playerDraftRounds.length < lobbyDTO.players.length) {
				return interaction.editReply({
					content: "Either complete player draft or use random-teams option",
					ephemeral: true,
				});
			}
		}

		const draft = await Draft.findByPk(lobby.draft_id);
		const draftService = new DraftService(draft);
		const playerDraftService = new PlayerDraftService(draft);
		const championDraftService = new ChampionDraftService(draft);

		if (draft.match_id) {
			return interaction.editReply({
				content: "This command cant be used with this lobby",
				ephemeral: true,
			});
		}

		const playerDraftManager =
			client.managers.playerDraftManagerFactory.getPlayerDraftManager(
				draft.draft_id
			);

		playerDraftManager.reset();

		playerDraftManager.captains = await draftService.pickCaptains(lobbyDTO);
		playerDraftManager.picking_captain = playerDraftManager.captains[1];
		draft.red_captain_id = playerDraftManager.captains[0].user_id;
		draft.blue_captain_id = playerDraftManager.captains[1].user_id;
		await draft.save();

		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			draft.draft_id
		);

		draftManager.reset();

		if (randomTeams) {
			const players = lobbyDTO.players;
			const shuffledPlayers = players.sort(() => 0.5 - Math.random());

			const availablePlayers = shuffledPlayers.filter((p) => {
				return (
					p.user_id !== playerDraftManager.captains[0].user_id &&
					p.user_id !== playerDraftManager.captains[1].user_id
				);
			});

			await playerDraftService.addPlayerToTeamByUserID(
				playerDraftManager.captains[0].user_id,
				"red",
				1
			);
			await playerDraftService.addPlayerToTeamByUserID(
				playerDraftManager.captains[1].user_id,
				"blue",
				1
			);
			playerDraftManager.currentRound++;

			while (availablePlayers.length > 0) {
				const maxPicks = playerDraftManager.maxPicks();
				const players = availablePlayers.splice(0, maxPicks).map((p) => {
					return new UserDTO(p);
				});
				for (const player of players) {
					await playerDraftService.addPlayerToTeamByUserID(
						player.user_id,
						playerDraftManager.currentTeam,
						playerDraftManager.currentRound
					);
				}
				playerDraftManager.currentRound++;
				playerDraftManager.currentTeam =
					playerDraftManager.currentTeam === "red" ? "blue" : "red";
			}
		}

		const draftRounds = await DraftRound.findAll({
			where: {
				draft_id: draft.draft_id,
			},
		});

		if (draftRounds.length > 0) {
			await DraftRound.destroy({
				where: {
					draft_id: draft.draft_id,
				},
			});
		}

		const champions = await Champion.findAll({});

		const picked_champs = [];
		const banned_champs = [];

		for (let i = 0; i < draftManager.roundSequence.length; i++) {
			const round = draftManager.roundSequence[i];
			const action = round.action;

			let champion = champions[Math.floor(Math.random() * champions.length)];
			while (
				picked_champs.includes(champion) ||
				banned_champs.includes(champion)
			) {
				champion = champions[Math.floor(Math.random() * champions.length)];
			}

			if (action === "pick") {
				await championDraftService.handleChampSelect(
					interaction,
					champion,
					"pick",
					true
				);
				picked_champs.push(champion);
			} else {
				await championDraftService.handleChampSelect(
					interaction,
					champion,
					"ban",
					true
				);
				banned_champs.push(champion);
			}
		}

		await championDraftService.generateChampionDraftEmbed(draft);

		await interaction.editReply({
			content: "ARAM selections complete",
			ephemeral: true,
		});
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "champion") {
			championAutocomplete(focusedValue.value, interaction);
		}
	},
};
