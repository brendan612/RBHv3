const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const { syncCommands } = require("../../utilities/deploy-commands.js");

module.exports = {
    data: new SlashCommandBuilder().setName("sync").setDescription("Sync commands with Discord"),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        await syncCommands();
        await interaction.reply({
            content: "Commands synced.",
            ephemeral: true,
        });
    },
};
