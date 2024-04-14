const { SlashCommandBuilder, Interaction, User, ModerationLog } = require("./index.js");
const ms = require("ms");
const { userOption } = require("../lobby/index.js");
const { TimestampFormat, displayDateAsTimestamp } = require("../../utilities/timestamp.js");
const { re } = require("mathjs");
const { Op } = require("sequelize");
const { ActionType } = require("../../components/moderationActionTypeEnum.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge-user")
        .setDescription("Purge a user's messages")
        .addUserOption(userOption("target", "Targeted User", true))
        .addStringOption((option) => option.setName("reason").setDescription("Reason for ban").setRequired(true)),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        await interaction.reply({
            content: "Purging messages...",
            ephemeral: true,
        });

        const user_id = interaction.options.getUser("target").id;
        const targeted_user = await User.findOne({ where: { user_id: user_id } });

        const messages = await interaction.channel.messages.fetch({
            limit: 100,
        });
        const userMessages = messages.filter((m) => m.author.id === targeted_user.user_id);

        if (userMessages.size === 0) {
            await interaction.reply({
                content: `No messages found for <@${targeted_user.user_id}>`,
                ephemeral: true,
            });
            return;
        }

        await interaction.channel.bulkDelete(userMessages);

        await interaction.editReply({
            content: `Deleted ${userMessages.length} messages from <@${targeted_user.user_id}>`,
            ephemeral: true,
        });
    },
};
