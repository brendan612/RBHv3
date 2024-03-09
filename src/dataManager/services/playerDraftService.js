const { Draft, User, PlayerDraftRound } = require("../../models");
const DraftDTO = require("../DTOs/draftDTO");
const UserDTO = require("../DTOs/userDTO");
const LobbyDTO = require("../DTOs/lobbyDTO");
const client = require("../../client.js");
const LobbyService = require("./lobbyService.js");

const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

class PlayerDraftService {
	/**
	 *
	 * @param {Draft} draft
	 */
	constructor(draft) {
		this.draft = draft;
		this.playerDraftManager =
			client.managers.playerDraftManagerFactory.getPlayerDraftManager(
				this.draft.draft_id
			);
	}

	/**
	 *
	 * @param {DraftDTO} draft
	 * @param {boolean} sendMessage
	 */
	async generatePlayerDraftEmbed(draft, sendMessage = true) {
		const {
			generatePlayerDraftEmbed,
		} = require("../messages/playerDraftEmbed");
		const result = await generatePlayerDraftEmbed(draft, sendMessage);

		// if (sendMessage) {
		// 	await this.setMessage(result.id);
		// }
	}

	/**
	 *
	 */
	async setSidesAndCaptains(user_id, side) {
		/** @typedef PlayerDraftManager */

		const lobby = await LobbyService.getLobby(this.draft.lobby_id);

		const guild = client.guilds.cache.get(client.guildID);
		const member = guild.members.cache.get(user_id);

		let canPickSides =
			user_id == lobby.host_id || hasRequiredRoleOrHigher(member, "admin");

		let pickingCaptain = this.playerDraftManager.picking_captain;
		let otherCaptain = this.playerDraftManager.captains.find(
			(captain) => captain.user_id !== pickingCaptain.user_id
		);

		if (pickingCaptain.user_id !== user_id && !canPickSides) {
			throw new Error(
				`You are not the picking captain. <@${pickingCaptain.user_id}> is.`
			);
		}

		if (side === "blue") {
			await this.draft.update({
				blue_captain_id: pickingCaptain.user_id.toString(),
			});
			await this.draft.update({
				red_captain_id: otherCaptain.user_id.toString(),
			});

			this.addPlayerToTeam(pickingCaptain, "blue", 1);
			this.addPlayerToTeam(otherCaptain, "red", 1);

			this.playerDraftManager.blue_captain = pickingCaptain;
			this.playerDraftManager.red_captain = otherCaptain;
		} else {
			await this.draft.update({
				red_captain_id: pickingCaptain.user_id.toString(),
			});
			await this.draft.update({
				blue_captain_id: otherCaptain.user_id.toString(),
			});

			this.addPlayerToTeam(pickingCaptain, "red", 1);
			this.addPlayerToTeam(otherCaptain, "blue", 1);

			this.playerDraftManager.red_captain = pickingCaptain;
			this.playerDraftManager.blue_captain = otherCaptain;
		}

		this.playerDraftManager.currentRound = 2;
		await this.generatePlayerDraftEmbed(
			new DraftDTO(await Draft.findByPk(this.draft.draft_id)),
			true
		);
	}

	/**
	 *
	 * @param {UserDTO} player
	 * @param {string} team
	 * @param {number} round
	 */
	async addPlayerToTeam(player, team, round) {
		await this.addPlayerToTeamByUserID(player.user_id, team, round);
	}

	async addPlayerToTeamByUserID(user_id, team, round) {
		const playerDraftRound = await PlayerDraftRound.create({
			draft_id: this.draft.draft_id,
			user_id: user_id.toString(),
			team: team,
			round_number: round,
		});
	}

	/**
	 *
	 * @param {UserDTO} player
	 * @param {string} team
	 * @param {number} round
	 */
	async removePlayerFromTeam(player, team, round) {
		const playerDraftRound = await PlayerDraftRound.findOne({
			where: {
				draft_id: this.draft.draft_id,
				user_id: player.user_id,
				team: team,
				round: round,
			},
		});

		await playerDraftRound.destroy();
	}

	async handlePlayerSelectMenu(interaction, values) {
		let draftOver = false;

		const user_id = interaction.member.id;
		const allowedUsers = [];
		const currentTeam = this.playerDraftManager.currentTeam;
		if (currentTeam === "red") {
			allowedUsers.push(this.draft.red_captain_id);
		} else {
			allowedUsers.push(this.draft.blue_captain_id);
		}

		const canPick =
			allowedUsers.includes(user_id) ||
			hasRequiredRoleOrHigher(interaction.member, "moderator");

		if (!canPick) {
			return await interaction.reply({
				content: "You are not the picking captain",
				ephemeral: true,
			});
		}

		if (currentTeam === "red") {
			if (canPick) {
				for (const value of values) {
					//prettier-ignore
					await this.addPlayerToTeamByUserID(
						value,
						"red",
						this.playerDraftManager.currentRound
					);
				}
			} else {
				return await interaction.reply({
					content: "It is not your turn to pick",
					ephemeral: true,
				});
			}

			if (this.playerDraftManager.currentRound === 5) {
				const pickedPlayers = await PlayerDraftRound.findAll({
					where: { draft_id: this.draft.draft_id },
					include: [User],
				});
				const lobby = await LobbyService.getLobby(this.draft.lobby_id);
				const remaining = lobby.players.filter((player) => {
					return !pickedPlayers
						.map((player) => player.user_id)
						.includes(player.user_id);
				})[0];
				await this.addPlayerToTeamByUserID(
					remaining.user_id,
					"blue",
					this.playerDraftManager.currentRound
				);
				draftOver = true;
			}
		} else {
			if (canPick) {
				for (const value of values) {
					//prettier-ignore
					await this.addPlayerToTeamByUserID(
						value,
						"blue",
						this.playerDraftManager.currentRound
					);
				}
			} else {
				return await interaction.reply({
					content: "It is not your turn to pick",
					ephemeral: true,
				});
			}
		}

		this.playerDraftManager.currentRound++;
		this.playerDraftManager.currentTeam =
			this.playerDraftManager.currentTeam === "red" ? "blue" : "red";

		await this.generatePlayerDraftEmbed(new DraftDTO(this.draft), true);

		await interaction.deferReply();
		await interaction.deleteReply();
	}
}

module.exports = PlayerDraftService;
