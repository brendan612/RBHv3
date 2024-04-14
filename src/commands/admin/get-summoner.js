const { SlashCommandBuilder, Interaction } = require("./index.js");

const { getSummonerByRiotID } = require("../../api/riot/riotApiHandler");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("get-summoner")
        .setDescription("Get a summoner by their Riot ID")
        .addStringOption((option) => option.setName("game-name").setDescription("Game Name").setRequired(true))
        .addStringOption((option) => option.setName("tag-line").setDescription("Tag Line").setRequired(true)),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        const summoner = await getSummonerByRiotID(interaction.options.getString("game-name"), interaction.options.getString("tag-line"));
        await interaction.reply({
            content: `Summoner Name: ${summoner.name}
			\r\nSummoner Level: ${summoner.summonerLevel}
			\r\nSummoner ID: ${summoner.id}
			\r\nAccount ID: ${summoner.accountId}
			\r\nPUUID: ${summoner.puuid}
			\r\nRevision Date: ${summoner.revisionDate}
			\r\nProfile Icon ID: ${summoner.profileIconId}\r\n`,
            ephemeral: true,
        });
    },
};
