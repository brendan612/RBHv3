const {
	Draft,
	Lobby,
	User,
	UserEloRating,
	DraftRound,
	MatchPlayer,
	Match,
	PlayerDraftRound,
} = require("../../models/index.js");
const LobbyService = require("./lobbyService.js");
const UserService = require("./userService.js");
const PlayerDraftService = require("./playerDraftService.js");
const MatchService = require("./matchService.js");
const LobbyDTO = require("../DTOs/lobbyDTO.js");
const DraftDTO = require("../DTOs/draftDTO.js");

const ChannelManager = require("../managers/channelManager.js");

const client = require("../../client.js");

const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

class ChampionDraftService {
	/**
	 *
	 * @param {Draft} draft
	 */
	constructor(draft) {
		this.draft = draft;
	}

	async startChampionDraft() {
		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			this.draft.draft_id
		);
		draftManager.begun = true;
		await this.generateChampionDraftEmbed(this.draft);

		const lobby = await Lobby.findByPk(this.draft.lobby_id);
		const redTeam = await PlayerDraftRound.findAll({
			where: {
				draft_id: this.draft.draft_id,
				team: "red",
			},
		});

		const blueTeam = await PlayerDraftRound.findAll({
			where: {
				draft_id: this.draft.draft_id,
				team: "blue",
			},
		});

		const redVoice = ChannelManager.getChannelViaServerChannel(
			lobby.game_id,
			lobby.region_id,
			lobby.lobby_name + "_Red"
		);

		const blueVoice = ChannelManager.getChannelViaServerChannel(
			lobby.game_id,
			lobby.region_id,
			lobby.lobby_name + "_Blue"
		);

		await ChannelManager.moveUsersToChannel(
			redVoice,
			redTeam.map((u) => u.user_id)
		);

		await ChannelManager.moveUsersToChannel(
			blueVoice,
			blueTeam.map((u) => u.user_id)
		);
	}

	async addBan(team, champion_id, round_number) {
		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			this.draft.draft_id
		);
		const draftRound = await DraftRound.create({
			draft_id: this.draft.draft_id,
			team: team,
			champion_id: champion_id,
			round_number: round_number,
			type: "ban",
		});

		if (team === "blue") {
			await draftManager.blue_team_bans.push(champion_id);
		} else {
			await draftManager.red_team_bans.push(champion_id);
		}
	}

	async addPick(team, champion_id, round_number) {
		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			this.draft.draft_id
		);
		const draftRound = await DraftRound.create({
			draft_id: this.draft.draft_id,
			team: team,
			champion_id: champion_id,
			round_number: round_number,
			type: "pick",
		});

		if (team === "blue") {
			await draftManager.blue_team_picks.push(champion_id);
		} else {
			await draftManager.red_team_picks.push(champion_id);
		}
	}

	async handleChampSelect(
		interaction,
		champion,
		commandRoundType,
		aram = false
	) {
		const user_id = interaction.member.id;
		const draftManager = client.managers.draftManagerFactory.getDraftManager(
			this.draft.draft_id
		);

		const roundInfo = draftManager.roundSequence[draftManager.currentRound - 1];
		const team = roundInfo.team;
		const roundType = roundInfo.action;

		const isPickingCaptain =
			(team === "blue" && this.draft.blue_captain_id === user_id) ||
			(team === "red" && this.draft.red_captain_id === user_id);

		const member = interaction.member;

		const canPick =
			isPickingCaptain || hasRequiredRoleOrHigher(member, "moderator");
		if (!canPick) {
			return interaction.editReply({
				content: "You are not a captain or staff",
				ephemeral: true,
			});
		}

		if (roundType !== commandRoundType) {
			return interaction.editReply({
				content: `It is not time to ${commandRoundType}. It is time to ${roundType}`,
				ephemeral: true,
			});
		}

		if (!isPickingCaptain && !canPick) {
			return interaction.editReply({
				content: "You cannot pick for the other team",
				ephemeral: true,
			});
		}

		const rounds = await DraftRound.findAll({
			where: {
				draft_id: this.draft.draft_id,
			},
		});

		if (roundType === "ban") {
			await this.addBan(team, champion.champion_id, draftManager.currentRound);
		} else {
			await this.addPick(team, champion.champion_id, draftManager.currentRound);
		}

		const draftOver =
			draftManager.currentRound == draftManager.roundSequence.length;

		if (!draftOver) {
			draftManager.currentRound++;
			await this.generateChampionDraftEmbed(this.draft, !aram);
		} else {
			draftManager.drafted = true;
			await this.generateChampionDraftEmbed(this.draft, !aram);
			await MatchService.createMatch(this.draft);
		}

		if (!aram) {
			if (roundType === "ban") {
				await interaction.editReply({
					content: `You have banned ${champion.name}`,
					ephemeral: true,
				});
			} else {
				await interaction.editReply({
					content: `You have picked ${champion.name}`,
					ephemeral: true,
				});
			}
		}
	}

	async generateChampionDraftEmbed(draft, sendMessage = true) {
		const {
			generateChampionDraftEmbed,
		} = require("../messages/championDraftEmbed");
		if (sendMessage) {
			const result = await generateChampionDraftEmbed(draft, sendMessage);
		}
		// if (sendMessage) {
		// 	await this.setMessage(result.id);
		// }
	}
}

module.exports = ChampionDraftService;
