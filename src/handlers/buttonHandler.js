const { Interaction } = require("discord.js");
const { sequelize, Lobby, User, Draft, Match } = require("../models");
const LobbyService = require("../dataManager/services/lobbyService.js");
const UserService = require("../dataManager/services/userService.js");
const DraftService = require("../dataManager/services/draftService.js");
const PlayerDraftService = require("../dataManager/services/playerDraftService.js");
const ChampionDraftService = require("../dataManager/services/championDraftService.js");
const MatchService = require("../dataManager/services/matchService.js");
const {
	generateWinInputComponents,
} = require("../components/embeds/winButtonComponents.js");
const client = require("../client.js");

const {
	hasRequiredRoleOrHigher,
} = require("../utilities/utility-functions.js");

/**
 *
 * @param {Interaction} interaction
 */
async function handleJoinButton(interaction) {
	await handleLobbyButtons(interaction);
}
/**
 *
 * @param {Interaction} interaction
 */
async function handleDropButton(interaction) {
	await handleLobbyButtons(interaction);
}
/**
 *
 * @param {Interaction} interaction
 */
async function handleDraftButton(interaction) {
	await handleLobbyButtons(interaction);
}
/**
 *
 * @param {Interaction} interaction
 */
async function handleLobbyButtons(interaction) {
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const lobby_id = idParts[1];
	const lobby = await Lobby.findByPk(lobby_id);
	const lobbyService = new LobbyService(lobby);
	await lobbyService.handleButton(interaction, idParts[0]);
}

/**
 *
 * @param {Interaction} interaction
 * @returns {Promise<boolean>}
 */
async function verifyLobbyPermission(interaction) {
	const userService = await UserService.createUserService(
		interaction.member.id
	);
	const allowed = await userService.verifyLobbyCommandPermission(interaction);

	return allowed;
}

/**
 *
 * @param {Interaction} interaction
 */
async function handlePickSidesButton(interaction) {
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);
	const playerDraftService = new PlayerDraftService(draft);

	try {
		await playerDraftService.setSidesAndCaptains(
			interaction.member.id,
			idParts[2]
		);
	} catch (error) {
		return await interaction.reply({
			content: error.message,
			ephemeral: true,
		});
	}

	await interaction.deferReply();
	await interaction.deleteReply();
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleStartChampDraftButton(interaction) {
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	if (
		draft.host_id !== interaction.member.id &&
		!hasRequiredRoleOrHigher(interaction.member, "admin")
	) {
		return await interaction.reply({
			content: "Only the host can start the champion draft",
			ephemeral: true,
		});
	}

	const championDraftService = new ChampionDraftService(draft);
	await championDraftService.startChampionDraft();
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleVerifyButton(interaction) {
	const user = await User.findOne({
		where: { user_id: interaction.member.id },
	});
	const userService = new UserService(user);
	await userService.handleVerifyInteraction(interaction);
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleRedWinButton(interaction) {
	await interaction.deferUpdate();
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	const canUse =
		draft.host_id == interaction.member.id ||
		hasRequiredRoleOrHigher(interaction.member, "moderator");

	if (!canUse) {
		return await interaction.reply({
			content: "You do not have permission to use this button",
			ephemeral: true,
		});
	}

	const draftManager =
		client.managers.draftManagerFactory.getDraftManager(draft_id);

	draftManager.showRedConfirm = true;
	const winInputComponents = await generateWinInputComponents(draft, "red");
	await interaction.message.edit({
		components: [winInputComponents],
	});
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleRedWinConfirmButton(interaction) {
	await interaction.deferUpdate();
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	const canUse =
		draft.host_id == interaction.member.id ||
		hasRequiredRoleOrHigher(interaction.member, "moderator");

	if (!canUse) {
		return await interaction.reply({
			content: "You do not have permission to use this button",
			ephemeral: true,
		});
	}

	let match = await MatchService.getMatch(draft.match_id);
	if (!match) {
		match = await MatchService.createMatch(draft);
	}

	const matchService = await MatchService.createMatchService(match.match_id);
	await matchService.submitWin("red");
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleBlueWinButton(interaction) {
	await interaction.deferUpdate();
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	const canUse =
		draft.host_id == interaction.member.id ||
		hasRequiredRoleOrHigher(interaction.member, "moderator");

	if (!canUse) {
		return await interaction.reply({
			content: "You do not have permission to use this button",
			ephemeral: true,
		});
	}
	const winInputComponents = await generateWinInputComponents(draft, "blue");
	await interaction.message.edit({
		components: [winInputComponents],
	});
}

/**
 *
 * @param {Interaction} interaction
 */
async function handleBlueWinConfirmButton(interaction) {
	await interaction.deferUpdate();
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	const canUse =
		draft.host_id == interaction.member.id ||
		hasRequiredRoleOrHigher(interaction.member, "moderator");

	if (!canUse) {
		return await interaction.reply({
			content: "You do not have permission to use this button",
			ephemeral: true,
		});
	}

	let match = await MatchService.getMatch(draft.match_id);
	if (!match) {
		match = await MatchService.createMatch(draft);
	}

	const matchService = await MatchService.createMatchService(match.match_id);

	await matchService.submitWin("blue");
}

async function handleCancelWinButton(interaction) {
	await interaction.deferUpdate();
	const allowed = await verifyLobbyPermission(interaction);
	if (!allowed) return;

	const idParts = interaction.customId.split("_");
	const draft_id = idParts[1];
	const draft = await Draft.findByPk(draft_id);

	const winInputComponents = await generateWinInputComponents(draft);
	await interaction.message.edit({
		components: [winInputComponents],
	});
}

module.exports = {
	handleJoinButton,
	handleDropButton,
	handleDraftButton,
	handlePickSidesButton,
	handleStartChampDraftButton,
	handleVerifyButton,
	handleRedWinButton,
	handleRedWinConfirmButton,
	handleBlueWinButton,
	handleBlueWinConfirmButton,
	handleCancelWinButton,
};
