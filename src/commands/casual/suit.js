const { SlashCommandBuilder, Interaction, User } = require("../admin/index.js");

const { baseEmbed } = require("../../components/embed.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const options = [
    ["Hearts", "hearts", "https://i.imgur.com/j0RDHcE.png"],
    ["Diamonds", "diamonds", "https://i.imgur.com/sfTvUj5.png"],
    ["Spades", "spades", "https://i.imgur.com/IqD2OL5.png"],
    ["Clubs", "clubs", "https://i.imgur.com/VkYqWx5.png"],
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("suit")
        .setDescription("Pick a suit")
        .addStringOption((option) => {
            return option.setName("suit").setDescription("The suit you want to bet on.").setRequired(true).setChoices(
                {
                    name: options[0][0],
                    value: options[0][1],
                },
                {
                    name: options[1][0],
                    value: options[1][1],
                },
                {
                    name: options[2][0],
                    value: options[2][1],
                },
                {
                    name: options[3][0],
                    value: options[3][1],
                },
            );
        })
        .addIntegerOption((option) => {
            return option.setName("amount").setDescription("The amount you want to bet.").setRequired(true);
        }),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction, prevSuit = null, prevAmount = null, prevCommandInteraction = null) {
        const user = await User.findOne({
            where: { user_id: interaction.member.id },
        });

        const suit = prevSuit || interaction.options.getString("suit");
        const amount = prevAmount || interaction.options.getInteger("amount");

        if (user.server_money < amount) {
            return await interaction.reply({
                content: "You don't have enough money for that bet!",
                ephemeral: true,
            });
        }

        const selectedIndex = Math.floor(Math.random() * 4);
        const selectedOption = options[selectedIndex][0];

        const won = options[selectedIndex][1] === suit;

        const winAmount = won ? amount * 4 : 0;
        const result = won ? `You won ${winAmount} :pound:` : `You lost ${amount} :pound:`;

        const embed = baseEmbed(`The correct suit was ${selectedOption}`, result, false, "Suits Game");

        embed.setThumbnail(options[selectedIndex][2]);

        const button_id = `suit_${suit}_${amount}`;

        const joinButton = new ButtonBuilder().setStyle(ButtonStyle.Success).setLabel("Repeat Wager").setCustomId(button_id);

        const components = new ActionRowBuilder().addComponents(joinButton);
        if (won) {
            user.server_money += winAmount;
        } else {
            user.server_money -= amount;
        }

        await user.save();

        let message = null;
        if (prevSuit) {
            message = await prevCommandInteraction.followUp({
                embeds: [embed],
                components: [components],
                ephemeral: false,
            });
        } else {
            message = await interaction.reply({
                embeds: [embed],
                components: [components],
                ephemeral: false,
            });
        }

        try {
            const filter = (i) => i.user.id === interaction.user.id;
            const i = await message.awaitMessageComponent({ filter, time: 15000 });
            message.edit({
                embeds: [embed],
                components: [],
            });
            this.execute(i, suit, amount, prevCommandInteraction || interaction);
        } catch {
            message.edit({
                embeds: [embed],
                components: [],
            });
        }
    },
};
