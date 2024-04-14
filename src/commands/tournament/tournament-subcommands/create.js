const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ModalSubmitInteraction,
    ButtonBuilder,
    Message,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require("discord.js");
const { SlashCommandBuilder, SlashCommandSubcommandBuilder, Interaction, Game, GameMode } = require("../index.js");

const moment = require("moment");

const TournamentManager = require("../../../dataManager/managers/tournamentManager.js");

const tournamentCreateSubCommand = () => {
    return new SlashCommandSubcommandBuilder().setName("create").setDescription("Create a tournament");
};

/**
 * Generate the tournament create modal
 * @param {Interaction} interaction
 */
const generateTournamentCreateModal = async (interaction) => {
    const formModal = new ModalBuilder().setCustomId("tournament_create_form").setTitle("Create a new Tournament");

    const name = new TextInputBuilder().setCustomId("name").setPlaceholder("Enter the tournament name").setLabel("Name").setStyle(TextInputStyle.Short).setRequired(true);

    const description = new TextInputBuilder().setCustomId("description").setPlaceholder("Enter the tournament description").setLabel("Description").setStyle(TextInputStyle.Paragraph);

    const nameActionRow = new ActionRowBuilder().addComponents(name);
    formModal.addComponents(nameActionRow);

    const descriptionActionRow = new ActionRowBuilder().addComponents(description);
    formModal.addComponents(descriptionActionRow);

    return await interaction.showModal(formModal);
};

/**
 * Handle the tournament create modal submission
 * @param {ModalSubmitInteraction} interaction
 */
const handleTournamentCreate = async (interaction) => {
    const name = interaction.fields.getTextInputValue("name");
    const description = interaction.fields.getTextInputValue("description");

    TournamentManager.startTournamentCreation(interaction.user.id, name, description);

    const button = createNextStepButton("Next Step: Tournament Dates", "tournament_create_form_dates_button");

    return await interaction.reply({
        content: "Tournament creation started.\nClick the button to continue",
        components: [button],
    });
};

/**
 * Create the follow up tournament dates button
 * @param {string} label
 * @returns {ActionRowBuilder}
 */
const createNextStepButton = (label, id) => {
    const button = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Primary));

    return button;
};

const handleFollowUpTournamentDatesButton = async (interaction) => {
    const current_tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    if (!current_tournament) {
        return await interaction.reply({
            content: "You cannot use this button.",
            ephemeral: true,
        });
    }

    const formModal = new ModalBuilder().setCustomId("tournament_create_form_dates").setTitle("Create a new Tournament");

    const registration_start_date = new TextInputBuilder()
        .setCustomId("registration_start_date")
        .setPlaceholder("Enter the Registration start date. Format: YYYY-MM-DD")
        .setLabel("Registration Start Date")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const registration_end_date = new TextInputBuilder()
        .setCustomId("registration_end_date")
        .setPlaceholder("Enter the Registration end date. Format: YYYY-MM-DD")
        .setLabel("Registration End Date")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const start_date = new TextInputBuilder()
        .setCustomId("start_date")
        .setPlaceholder("Enter the Tournament start date. Format: YYYY-MM-DD")
        .setLabel("Start Date")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const end_date = new TextInputBuilder()
        .setCustomId("end_date")
        .setPlaceholder("Enter the Tournament end date. Format: YYYY-MM-DD")
        .setLabel("End Date")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const registrationStartActionRow = new ActionRowBuilder().addComponents(registration_start_date);
    formModal.addComponents(registrationStartActionRow);

    const registrationEndActionRow = new ActionRowBuilder().addComponents(registration_end_date);
    formModal.addComponents(registrationEndActionRow);

    const startDateActionRow = new ActionRowBuilder().addComponents(start_date);
    formModal.addComponents(startDateActionRow);

    const endDateActionRow = new ActionRowBuilder().addComponents(end_date);
    formModal.addComponents(endDateActionRow);

    return await interaction.showModal(formModal);
};

/**
 * MARK: - Tournament Dates
 *
 * Handle the tournament dates submission
 * @param {ModalSubmitInteraction} interaction
 * @returns
 */
const handleTournamentDatesSubmit = async (interaction) => {
    const current_tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    let registration_start_date = new Date(interaction.fields.getTextInputValue("registration_start_date"));
    let registration_end_date = new Date(interaction.fields.getTextInputValue("registration_end_date"));
    let start_date = new Date(interaction.fields.getTextInputValue("start_date"));
    let end_date = new Date(interaction.fields.getTextInputValue("end_date"));

    const allValidDates = isValidDate(registration_start_date) && isValidDate(registration_end_date) && isValidDate(start_date) && isValidDate(end_date);

    if (!allValidDates) {
        const button = createNextStepButton("Next Step: Tournament Dates", "tournament_create_form_dates_button");
        return await interaction.reply({
            content: "Invalid date format. Please use YYYY-MM-DD and try again.",
            components: [button],
        });
    }

    if (registration_start_date > registration_end_date) {
        let temp = registration_start_date;
        registration_start_date = registration_end_date;
        registration_end_date = temp;
    }

    if (start_date > end_date) {
        let temp = start_date;
        start_date = end_date;
        end_date = temp;
    }

    TournamentManager.addTournamentDates(interaction.user.id, registration_start_date, registration_end_date, start_date, end_date);

    const tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    await interaction.deferReply();
    await interaction.deleteReply();
    await interaction.message.edit({
        content: "Tournament dates have been set.\n```" + JSON.stringify(tournament, null, 2) + "```",
        components: [createNextStepButton("Next Step: Select Game and Formats", "tournament_create_form_game_button")],
    });
};

/**
 *
 * @param {Interaction} interaction
 */
const handleTournamentGameFormatButton = async (interaction) => {
    const current_tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    if (!current_tournament) {
        await interaction.deferReply();
        return await interaction.message.edit({
            content: "You cannot use this button.",
            ephemeral: true,
        });
    }

    const games = await GameMode.findAll({
        where: {
            enabled: true,
        },
    });

    const gameOptions = games.map((game) => {
        return new StringSelectMenuOptionBuilder().setLabel(game.name).setValue(game.game_mode_id.toString());
    });

    const select = new StringSelectMenuBuilder().setCustomId("tournament_game_format_selection").setPlaceholder("Select a gamemode").addOptions(gameOptions).setMaxValues(1).setMinValues(1);

    const components = new ActionRowBuilder().addComponents(select);

    await interaction.deferReply();
    await interaction.deleteReply();
    return await interaction.message.edit({
        content: "Select a game mode for the tournament",
        components: [components],
    });
};

/**
 *
 * @param {Interaction} interaction
 * @param {string[]} values
 */
const handleTournamentGameFormatSelectMenu = async (interaction, values) => {
    await interaction.deferReply();
    await interaction.deleteReply();

    const game_mode_id = parseInt(values[0]);

    const gameMode = await GameMode.findByPk(game_mode_id);

    TournamentManager.addGameFormat(interaction.user.id, gameMode.game_id, gameMode.game_mode_id);

    const tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    const registration_type_select = new StringSelectMenuBuilder()
        .setCustomId("tournament_registration_type_selection")
        .setPlaceholder("Select a registration type")
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Open Registration").setValue("OPEN"),
            new StringSelectMenuOptionBuilder().setLabel("Invite Only").setValue("INVITE"),
            new StringSelectMenuOptionBuilder().setLabel("Leaderboard Registration").setValue("LEADERBOARD"),
        )
        .setMaxValues(1)
        .setMinValues(1);

    const registrationComponents = new ActionRowBuilder().addComponents(registration_type_select);

    await interaction.message.edit({
        content: "Tournament game mode has been set.\n```" + JSON.stringify(tournament, null, 2) + "```",
        components: [registrationComponents],
    });
};

const handleTournamentRegistrationTypeSelectMenu = async (interaction, values) => {
    await interaction.deferReply();
    await interaction.deleteReply();

    const registration_type = values[0];

    TournamentManager.addRegistrationType(interaction.user.id, registration_type);

    const tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    const elimination_type_select = new StringSelectMenuBuilder()
        .setCustomId("tournament_elimination_type_selection")
        .setPlaceholder("Select an elimination type")
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Single Elimination").setValue("SINGLE_ELIMINATION"),
            new StringSelectMenuOptionBuilder().setLabel("Double Elimination").setValue("DOUBLE_ELIMINATION"),
            new StringSelectMenuOptionBuilder().setLabel("Round Robin").setValue("ROUND_ROBIN"),
        )
        .setMaxValues(1)
        .setMinValues(1);

    const eliminationComponents = new ActionRowBuilder().addComponents(elimination_type_select);

    await interaction.message.edit({
        content: "Tournament registration type has been set.\n```" + JSON.stringify(tournament, null, 2) + "```",
        components: [eliminationComponents],
    });
};

const handleTournamentEliminationTypeSelectMenu = async (interaction, values) => {
    await interaction.deferReply();
    await interaction.deleteReply();

    const elimination_type = values[0];

    TournamentManager.addType(interaction.user.id, elimination_type);

    const tournament = TournamentManager.getTemporaryTournament(interaction.user.id);

    await interaction.message.edit({
        content: "Tournament elimination type has been set.\n```" + JSON.stringify(tournament, null, 2) + "```",
        components: [],
    });
};

/**
 *
 * @param {string} date
 * @param {string} format
 * @returns {boolean}
 */
function isValidDate(date, format = "YYYY-MM-DD") {
    const moment_date = moment(date, format, true);
    return moment_date.isValid();
}

module.exports = {
    tournamentCreateSubCommand,
    generateTournamentCreateModal,
    handleTournamentCreate,
    handleFollowUpTournamentDatesButton,
    handleTournamentDatesSubmit,
    handleTournamentGameFormatButton,
    handleTournamentGameFormatSelectMenu,
    handleTournamentRegistrationTypeSelectMenu,
    handleTournamentEliminationTypeSelectMenu,
};
