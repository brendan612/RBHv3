const { SlashCommandBuilder, Interaction, sequelize, Game, User, Season, Region } = require("./index.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("region")
        .setDescription("Manage regions on the server")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Create a new region")
                .addStringOption((option) => option.setName("region_id").setDescription("Region ID").setRequired(true))
                .addStringOption((option) => option.setName("platform").setDescription("Platform Routing Value").setRequired(true))
                .addStringOption((option) => option.setName("region").setDescription("Region Routing Value").setRequired(true)),
        ),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        if (interaction.options.getSubcommand() === "create") {
            const region_id = interaction.options.getString("region_id");
            const platform = interaction.options.getString("platform");
            const region = interaction.options.getString("region");

            try {
                let newRegion = await Region.createRegion(region_id, platform, region, true);
                await interaction.reply({
                    content: `Region \`\`${region_id}\`\` created.\n\`\`\`\n${JSON.stringify(newRegion, null, 2)}\`\`\``,
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: `Error creating region \`\`${region_id}\`\``,
                });
                return;
            }
        }
    },
};
