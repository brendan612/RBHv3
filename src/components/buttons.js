const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

/**
 *
 * @param {User[]} players
 * @param {string} label
 * @returns {ButtonBuilder}
 */
function generateOPGGButton(players, label = "OP.GG") {
    const url = "https://www.op.gg/multisearch/na?summoners=" + players.map((user) => encodeURIComponent(`${user.summoner_name}#${user.tag_line}`)).join("%2C");
    const multiGGButton = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);

    return multiGGButton;
}

module.exports = {
    generateOPGGButton,
};
