const { Events, Interaction, CommandInteraction } = require("discord.js");
const { sequelize, Lobby, User, Draft } = require("../models");
const LobbyService = require("../dataManager/services/lobbyService.js");
const PlayerDraftService = require("../dataManager/services/playerDraftService.js");
const ChampionDraftService = require("../dataManager/services/championDraftService.js");
const UserService = require("../dataManager/services/userService.js");
const { all } = require("axios");
const {
	handleJoinButton,
	handleDropButton,
	handleDraftButton,
	handlePickSidesButton,
	handleStartChampDraftButton,
	handleVerifyButton,
	handleRedWinButton,
	handleBlueWinButton,
	handleRedWinConfirmButton,
	handleBlueWinConfirmButton,
	handleCancelWinButton,
} = require("../handlers/buttonHandler.js");
const client = require("../client.js");
const permission_roles = require(`../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;
const roleHierarchy = require("../utilities/role-hierarchy.js");

const buttonHandlers = {
	join: handleJoinButton,
	drop: handleDropButton,
	draft: handleDraftButton,
	pick: handlePickSidesButton,
	startchampdraft: handleStartChampDraftButton,
	verify: handleVerifyButton,
	redwin: handleRedWinButton,
	bluewin: handleBlueWinButton,
	redwinconfirm: handleRedWinConfirmButton,
	bluewinconfirm: handleBlueWinConfirmButton,
	cancelwin: handleCancelWinButton,
};

const {
	hasRequiredRoleOrHigher,
} = require("../utilities/utility-functions.js");

module.exports = {
	name: Events.InteractionCreate,
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		try {
			if (interaction.isChatInputCommand()) {
				const enabled = client.features.get("SlashCommands");
				if (!enabled && !hasRequiredRoleOrHigher(interaction.member, "admin")) {
					return interaction.reply({
						content: "Bot commands are currently disabled",
						ephemeral: true,
					});
				}

				/** @type {CommandInteraction} */
				const command = interaction.client.commands.get(
					interaction.commandName
				);

				if (!command) return;

				try {
					const userService = await UserService.createUserService(
						interaction.member.id
					);

					switch (command.category) {
						case "admin":
							const allowed = await userService.verifyAdminCommandPermission(
								interaction
							);
							if (allowed) {
								command.execute(interaction);
							}
							break;
						case "lobby": {
							const allowed = await userService.verifyLobbyCommandPermission(
								interaction
							);

							if (allowed) {
								command.execute(interaction);
							}
							break;
						}
						default: {
							command.execute(interaction);
							break;
						}
					}
				} catch (error) {
					console.error(error);
					interaction.reply({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				}
			} else if (interaction.isAutocomplete()) {
				const command = interaction.client.commands.get(
					interaction.commandName
				);
				if (!command) return;

				try {
					await command.autocomplete(interaction);
				} catch (error) {
					console.error(error);
					interaction.reply({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				}
			} else if (interaction.isButton()) {
				const action = interaction.customId.split("_")[0];
				const handler = buttonHandlers[action];
				if (handler) {
					await handler(interaction);
				} else {
					console.log("No handler for button action: ", action);
				}
			} else if (interaction.isStringSelectMenu()) {
				const values = interaction.values;
				const player_draft_regex = /player_draft_/gm;
				if (player_draft_regex.test(interaction.customId)) {
					const idParts = interaction.customId.split("_");
					const draft_id = idParts[2];
					const draft = await Draft.findByPk(draft_id);
					const playerDraftService = new PlayerDraftService(draft);
					await playerDraftService.handlePlayerSelectMenu(interaction, values);
				}

				const league_role_regex = /league_role_/gm;
				if (league_role_regex.test(interaction.customId)) {
					const userService = await UserService.createUserService(
						interaction.member.id
					);
					await userService.handleLeagueRoleSelectMenu(interaction, values);
				}
			} else if (interaction.isUserContextMenuCommand()) {
				/** @type {CommandInteraction} */
				const command = interaction.client.commands.get(
					interaction.commandName
				);

				if (!command) return;

				command.execute(interaction);
			}
		} catch (error) {
			console.error(interaction);
			console.error(error);
			await interaction.reply({
				content:
					"There was an error while executing this command.\n>>> " +
					error.message,
				ephemeral: true,
			});
		}
	},
};
