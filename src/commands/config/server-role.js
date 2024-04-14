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
                        },
                    ),
                )
                .addStringOption((option) => option.setName("role_id").setDescription("The ID of the role").setRequired(true))
                .addStringOption((option) => option.setName("purpose").setDescription("The purpose the role is for").setRequired(true))
                .addStringOption((option) => option.setName("name").setDescription("The name of the role"))
                .addStringOption(gameOption())
                .addStringOption(regionOption()),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("view")
                .setDescription("View a server channel.")
                .addStringOption((option) => option.setName("channel_id").setDescription("The ID of the channel").setRequired(true)),
        ),
    /**
     *
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        if (interaction.options.getSubcommand() === "create") {
            const type = interaction.options.getString("type");
            let name = interaction.options.getString("name");
            const role_id = interaction.options.getString("role_id");
            const purpose = interaction.options.getString("purpose");
            const game = await handleGameOption(interaction);
            const region = await handleRegionOption(interaction, "GLOBAL");

            const existingRole = RoleManager.findServerRole(role_id);
            if (existingRole) {
                return interaction.reply({
                    content: `Role already exists`,
                    ephemeral: true,
                });
            }

            if (!name) {
                name = RoleManager.getRole(role_id).name;
            }

            const role = await RoleManager.createServerRole(role_id, name, purpose, game.game_id, type, region.region_id);

            client.serverRoles = await ServerRole.findAll();

            return interaction.reply({
                content: `Server Role created`,
                ephemeral: true,
            });
        } else if (interaction.options.getSubcommand() === "view") {
            const role_id = interaction.options.getString("role_id");

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
