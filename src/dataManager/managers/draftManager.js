const {
	ThreadChannel,
	TextChannel,
	EmbedBuilder,
	ActionRowBuilder,
	AttachmentBuilder,
} = require("discord.js");
const client = require("../../client.js");
const ThreadManager = require("../managers/threadManager.js");
const { Lobby, User, Draft } = require("../../models");

class DraftManager {
	constructor(draft_id) {
		this.draft_id = draft_id;
		this.currentRound = 1;
		this.currentTeam = "blue";
		this.red_team_bans = [];
		this.blue_team_bans = [];
		this.red_team_picks = [];
		this.blue_team_picks = [];
		this.begun = false;
		this.drafted = false;
		this.showRedConfirm = false;
		this.showBlueConfirm = false;
		this.matchOver = false;

		this.roundSequence = [
			{ team: "blue", action: "ban", round: 1 },
			{ team: "red", action: "ban", round: 2 },
			{ team: "blue", action: "ban", round: 3 },
			{ team: "red", action: "ban", round: 4 },
			{ team: "blue", action: "ban", round: 5 },
			{ team: "red", action: "ban", round: 6 },
			//end of first ban phase
			{ team: "blue", action: "pick", round: 7 },
			{ team: "red", action: "pick", round: 8 },
			{ team: "red", action: "pick", round: 9 },
			{ team: "blue", action: "pick", round: 10 },
			{ team: "blue", action: "pick", round: 11 },
			{ team: "red", action: "pick", round: 12 },
			//end of first pick phase
			{ team: "red", action: "ban", round: 13 },
			{ team: "blue", action: "ban", round: 14 },
			{ team: "red", action: "ban", round: 15 },
			{ team: "blue", action: "ban", round: 16 },
			//end of second ban phase
			{ team: "red", action: "pick", round: 17 },
			{ team: "blue", action: "pick", round: 18 },
			{ team: "blue", action: "pick", round: 19 },
			{ team: "red", action: "pick", round: 20 },
			//end of second pick phase
		];
	}

	async reset() {
		this.currentRound = 1;
		this.currentTeam = "blue";
		this.red_team_bans = [];
		this.blue_team_bans = [];
		this.red_team_picks = [];
		this.blue_team_picks = [];
		this.begun = false;
		this.drafted = false;
		this.showRedConfirm = false;
		this.showBlueConfirm = false;
		this.matchOver = false;
	}

	async setDraftService(draftService) {
		this.draftService = draftService;
	}

	async setCaptains(red_captain, blue_captain) {
		this.red_captain = red_captain;
		this.blue_captain = blue_captain;
	}

	/**
	 *
	 * @param {DraftDTO} draft
	 * @param {TextChannel|ThreadChannel} channel
	 * @param {string} messageText
	 * @param {EmbedBuilder} embed
	 * @param {ActionRowBuilder} components
	 * @param {AttachmentBuilder} attachments
	 * @param {bool} ephemeral
	 * @returns {Promise<Message>}
	 */
	async sendMessage(
		draft,
		channel,
		messageText,
		embed,
		components,
		attachments,
		ephemeral = false
	) {
		const lobby = await Lobby.findByPk(draft.lobby_id);
		const thread = await this.#getOrCreateThread(channel, draft);
		await this.#deletePreviousDraftMessages(channel, lobby.message_id);
		await this.#deletePreviousDraftMessages(channel, draft.message_id);
		await this.#deletePreviousDraftMessages(thread, draft.message_id);

		const messageOptions = {
			ephemeral: ephemeral,
		};

		if (embed) {
			messageOptions.embeds = [embed];
		}

		if (components) {
			messageOptions.components = Array.isArray(components)
				? components
				: [components];
		}

		if (attachments) {
			messageOptions.files = Array.isArray(attachments)
				? attachments
				: [attachments];
		}

		if (messageText) {
			messageOptions.content = messageText;
		}

		const message = await thread.send(messageOptions);
		return message;
	}

	/**
	 *
	 * @param {TextChannel|ThreadChannel} channel
	 * @param {Draft} draft
	 * @returns {Promise<ThreadChannel>}
	 */
	async #getOrCreateThread(channel, draft) {
		let thread = null;
		if (draft.thread_id) {
			thread = await channel.threads.fetch(draft.thread_id);
			if (!thread) {
				thread = await ThreadManager.createChannelThread(
					channel,
					draft.draft_id
				);
			}
		} else {
			thread = await ThreadManager.createChannelThread(channel, draft.draft_id);
		}

		return thread;
	}

	/**
	 *
	 * @param {TextChannel|ThreadChannel} channel
	 * @param {BigInt} message_id
	 */
	async #deletePreviousDraftMessages(channel, message_id) {
		try {
			const message = await channel.messages.fetch(message_id);
			if (message) {
				await message.delete();
			}
		} catch {}
	}
}

module.exports = DraftManager;
