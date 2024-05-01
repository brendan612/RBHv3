const { Season, Game, UserEloRating, Region, User } = require("../../models");
const { baseEmbed } = require("../../components/embed.js");
const { channels } = require(`../../../${process.env.CONFIG_FILE}`);
const client = require("../../client.js");
const { generateVeteransImage } = require("./veteransImage.js");
const { getStatsForUser } = require("../queries/stats/stats.js");

/**
 *
 * @param {number} game_id
 * @param {number} season_id
 */
async function generateSeasonEndEmbed(game_id, season_id) {
    const game = await Game.findByPk(game_id);
    const season = await Season.findByPk(season_id);

    const regions = await Region.findAll({
        where: {
            enabled: true,
        },
    });

    for (const region of regions) {
        const embed = baseEmbed(`${season.name}`, `**__Top Players for the season__**`);

        const userEloRatings = await UserEloRating.findAll({
            where: {
                game_id: game_id,
                season_id: season_id,
            },
            include: [
                {
                    model: User,
                    as: "User",
                    where: {
                        region_id: region.region_id,
                    },
                },
            ],
            order: [["elo_rating", "DESC"]],
            limit: 3,
        });

        console.log(userEloRatings);
        const firstPlaceStats = await getStatsForUser(userEloRatings[0].user_id, game_id, season_id, region.region_id);
        const secondPlaceStats = await getStatsForUser(userEloRatings[1].user_id, game_id, season_id, region.region_id);
        const thirdPlaceStats = await getStatsForUser(userEloRatings[2].user_id, game_id, season_id, region.region_id);
        embed.addFields({
            name: ":tada: **1st Place** :tada:",
            value: `<@${userEloRatings[0].user_id}> | ${userEloRatings[0].elo_rating}\n**W** ${firstPlaceStats.wins} | **L**: ${firstPlaceStats.losses}`,
        });

        embed.addFields({
            name: "**2nd Place**",
            value: `<@${userEloRatings[1].user_id}> | ${userEloRatings[1].elo_rating}\n**W** ${secondPlaceStats.wins} | **L**: ${secondPlaceStats.losses}`,
        });

        embed.addFields({
            name: "**3rd Place**",
            value: `<@${userEloRatings[2].user_id}> | ${userEloRatings[2].elo_rating}\n**W** ${thirdPlaceStats.wins} | **L**: ${thirdPlaceStats.losses}`,
        });

        embed.addFields({
            name: "\n*\u200b*",
            value: "**__Most Active Players__**",
        });

        const attachment = await generateVeteransImage(game, season, region.region_id);
        embed.setImage(`attachment://${attachment.name}`);

        const channel = client.guild.channels.cache.get(client.serverChannels.filter((c) => c.game_id == game_id && c.region_id == region.region_id && c.purpose == "hall_of_fame")[0].channel_id);

        await channel.send({ embeds: [embed], files: [attachment] });
    }
}

module.exports = {
    generateSeasonEndEmbed,
};
