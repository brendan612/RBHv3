const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const ChampionService = require("../../dataManager/services/championService.js");

module.exports = {
    data: new SlashCommandBuilder().setName("sync-patch").setDescription("Sync League of Legends patch data with the bot"),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        const championService = new ChampionService();
        const patch = await championService.getLatestPatch();
        const champData = await championService.getChampionData(patch);
        await championService.updateChampionData(champData);
        await interaction.reply({
            content: "Patch synced.",
            ephemeral: true,
        });
    },
};
