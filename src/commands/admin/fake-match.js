const {
	SlashCommandBuilder,
	Interaction,
	User,
	Lobby,
	Draft,
	DraftRound,
	Champion,
	Sequelize,
	PlayerDraftRound,
} = require("./index.js");
const LobbyService = require("../../dataManager/services/lobbyService.js");
const DraftService = require("../../dataManager/services/draftService.js");
const ChampionDraftService = require("../../dataManager/services/championDraftService.js");
const PlayerDraftService = require("../../dataManager/services/playerDraftService.js");
const client = require("../../client.js");
const { Op } = require("sequelize");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("fake-match")
		.setDescription("Create a fake match for testing purposes"),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		let lobbyDTO = await LobbyService.createLobby(interaction.member.id, 1);
		const lobby = await Lobby.findByPk(lobbyDTO.lobby_id);

		const lobbyService = new LobbyService(lobby);

		const draftDTO = await DraftService.createDraft(lobby.lobby_id);
		const draft = await Draft.findByPk(draftDTO.draft_id);
		lobby.draft_id = draft.draft_id;

		await lobby.save();

		const lobbyUsers = await lobby.getUsers();

		let dummies = await User.findAll({
			where: {
				user_id: {
					[Op.between]: [1, 10 - lobbyUsers.length],
				},
			},
		});
		for (const dummy of dummies) {
			await lobbyService.addUser(dummy.user_id);
		}

		lobbyDTO = await LobbyService.getLobby(lobby.lobby_id);

		const draftService = new DraftService(await Draft.findByPk(draft.draft_id));
		const playerDraftManager =
			client.managers.playerDraftManagerFactory.getPlayerDraftManager(
				draft.draft_id
			);

		playerDraftManager.captains = await draftService.pickCaptains(lobbyDTO);

		const playerDraftService = new PlayerDraftService(draft);

		draft.red_captain_id = playerDraftManager.captains[0].user_id;
		draft.blue_captain_id = playerDraftManager.captains[1].user_id;
		await draft.save();

		await playerDraftService.addPlayerToTeamByUserID(
			draft.red_captain_id,
			"red",
			1
		);
		await playerDraftService.addPlayerToTeamByUserID(
			draft.blue_captain_id,
			"blue",
			1
		);

		dummies = dummies.filter((dummy) => {
			return (
				dummy.user_id !== draft.red_captain_id &&
				dummy.user_id !== draft.blue_captain_id
			);
		});
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[0].user_id,
			"blue",
			2
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[1].user_id,
			"red",
			3
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[2].user_id,
			"red",
			3
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[3].user_id,
			"blue",
			4
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[4].user_id,
			"blue",
			4
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[5].user_id,
			"red",
			5
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[6].user_id,
			"red",
			5
		);
		await playerDraftService.addPlayerToTeamByUserID(
			dummies[7].user_id,
			"blue",
			6
		);

		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			draft.draft_id
		);

		const championDraftService = new ChampionDraftService(draft);

		//get a random list of 20 champions
		const champions = await Champion.findAll({
			order: Sequelize.literal("RAND()"),
			limit: 20,
		});

		for (const round of draftManager.roundSequence) {
			if (round.action === "ban") {
				await championDraftService.addBan(
					round.team,
					champions[round.round - 1].champion_id,
					round.round
				);
			} else {
				await championDraftService.addPick(
					round.team,
					champions[round.round - 1].champion_id,
					round.round
				);
			}
		}

		await championDraftService.generateChampionDraftEmbed(draft);

		await interaction.editReply("Fake match created");
	},
};
