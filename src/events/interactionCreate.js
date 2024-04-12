const { Events, Interaction, CommandInteraction } = require("discord.js");
const { Draft, InteractionLog } = require("../models");
const PlayerDraftService = require("../dataManager/services/playerDraftService.js");
const UserService = require("../dataManager/services/userService.js");
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
	handleUnbanButton,
} = require("../handlers/buttonHandler.js");
const client = require("../client.js");

const {
	handleTournamentCreate,
	handleFollowUpTournamentDatesButton,
	handleTournamentDatesSubmit,
	handleTournamentGameFormatButton,
	handleTournamentGameFormatSelectMenu,
	handleTournamentRegistrationTypeSelectMenu,
	handleTournamentEliminationTypeSelectMenu,
} = require("../commands/tournament/tournament-subcommands/create.js");
//prettier-ignore
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
	unban: handleUnbanButton,
	tournament_create_form_dates_button: handleFollowUpTournamentDatesButton,
	tournament_create_form_game_button: handleTournamentGameFormatButton,
	tournament_registration_type_selection: handleTournamentRegistrationTypeSelectMenu,
	tournament_elimination_type_selection: handleTournamentEliminationTypeSelectMenu,
};

const modalHandlers = {
	tournament_create_form: handleTournamentCreate,
	tournament_create_form_dates: handleTournamentDatesSubmit,
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
			const enabled = client.features.get("SlashCommands");
			if (!enabled && !hasRequiredRoleOrHigher(interaction.member, "admin")) {
				return interaction.reply({
					content: "Bot commands are currently disabled",
					ephemeral: true,
				});
			}

			const start = new Date();

			if (interaction.isChatInputCommand()) {
				/** @type {CommandInteraction} */
				const command = interaction.client.commands.get(
					interaction.commandName
				);

				if (!command) return;

				try {
					if (interaction.commandName === "sync-db") {
						command.execute(interaction);
						return;
					}
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
				let action = interaction.customId.split("_")[0];
				if (action === "tournament") {
					action = interaction.customId;
				}
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

				const tournament_game_format_regex =
					/tournament_game_format_selection/gm;
				if (tournament_game_format_regex.test(interaction.customId)) {
					await handleTournamentGameFormatSelectMenu(interaction, values);
				}

				const tournament_registration_type_regex =
					/tournament_registration_type/gm;
				if (tournament_registration_type_regex.test(interaction.customId)) {
					await handleTournamentRegistrationTypeSelectMenu(interaction, values);
				}

				const tournament_elimination_type_regex =
					/tournament_elimination_type/gm;
				if (tournament_elimination_type_regex.test(interaction.customId)) {
					await handleTournamentEliminationTypeSelectMenu(interaction, values);
				}
			} else if (interaction.isUserContextMenuCommand()) {
				/** @type {CommandInteraction} */
				const command = interaction.client.commands.get(
					interaction.commandName
				);

				if (!command) return;

				command.execute(interaction);
			} else if (interaction.isModalSubmit()) {
				const action = interaction.customId;
				const handler = modalHandlers[action];
				if (handler) {
					await handler(interaction);
				} else {
					console.log("No handler for modal action: ", action);
				}
			}

			const end = new Date();

			const elapsed_time = end - start;

			if (!interaction.isAutocomplete()) {
				await InteractionLog.createLog(interaction, elapsed_time);
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
