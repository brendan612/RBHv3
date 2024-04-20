const { SlashCommandBuilder, CommandInteraction, gameOption, gameAutocomplete, handleGameOption, regionAutocomplete, regionOption, handleRegionOption } = require("./index.js");
const { ServerRole } = require("../../models/index.js");

const client = require("../../client.js");

const RoleManager = require("../../dataManager/managers/roleManager.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server-role")
        .setDescription("Manage server roles")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Create a new server role.")
                .addStringOption((option) =>
                    option.setName("type").setDescription("The type of role").setRequired(true).addChoices(
                        {
                            name: "Level Role",
                            value: "0",
                        },
                        {
                            name: "Game Role",
                            value: "1",
                        },
                        {
                            name: "Permission Role",
                            value: "2",
                        },
                        {
                            name: "Misc Role",
                            value: "3",
                        },
                        {
                            name: "Donor Role",
                            value: "4",
                        }
                    )
                )
                .addRoleOption((option) => option.setName("role").setDescription("The role to create a server role for").setRequired(true))
                .addStringOption((option) => option.setName("purpose").setDescription("The purpose the role is for").setRequired(true))
                .addStringOption(gameOption())
                .addStringOption(regionOption())
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("view")
                .setDescription("View a server role.")
                .addRoleOption((option) => option.setName("role").setDescription("The role to view").setRequired(true))
        ),
    /**
     *
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        if (interaction.options.getSubcommand() === "create") {
            const type = interaction.options.getString("type");
            const guildRole = interaction.options.getRole("role");
            const purpose = interaction.options.getString("purpose");
            const game = await handleGameOption(interaction);
            const region = await handleRegionOption(interaction, "GLOBAL");

            const existingRole = RoleManager.findServerRole(guildRole.id);
            if (existingRole) {
                return interaction.reply({
                    content: `Role already exists`,
                    ephemeral: true,
                });
            }

            const role = await RoleManager.createServerRole(guildRole.id, guildRole.name, purpose, game.game_id, type, region.region_id);

            client.serverRoles = await ServerRole.findAll();

            return interaction.reply({
                content: `Server Role created`,
                ephemeral: true,
            });
        } else if (interaction.options.getSubcommand() === "view") {
            const role_id = interaction.options.getRole("role").id;

            const role = RoleManager.findServerRole(role_id);

            if (!role) {
                return interaction.reply({
                    content: `Role not found`,
                    ephemeral: true,
                });
            }

            return interaction.reply({
                content: `Server Role: ${role.name}\n\`\`\`${JSON.stringify(role, null, 2)}\`\`\``,
                ephemeral: true,
            });
        }
    },
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        if (focusedValue.name === "game") {
            gameAutocomplete(focusedValue.value, interaction);
        } else if (focusedValue.name === "region") {
            regionAutocomplete(focusedValue.value, interaction);
        }
    },
};
