const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { SlashCommandBuilder, Interaction, User, Referral, ReferralCode } = require("./index.js");
const { baseEmbed } = require("../../components/embed.js");
const UserService = require("../../dataManager/services/userService.js");
const client = require("../../client.js");
const { Op, Sequelize } = require("sequelize");

const channels = require(`../../../${process.env.CONFIG_FILE}`).channels;

module.exports = {
    data: new SlashCommandBuilder().setName("referral").setDescription("Get or generate your referral link. If you generate a referral link"),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        const user = await User.findByPk(interaction.member.id);
        const referral = await ReferralCode.findOne({
            where: {
                user_id: user.user_id,
            },
        });

        if (referral) {
            return await interaction.reply({
                content: `Your referral link is:\`\`\`https://discord.gg/${referral.code}\`\`\`You have ${referral.uses} uses`,
                ephemeral: true,
            });
        }

        client.guild.invites
            .create(channels["welcome"], {
                maxAge: 0,
                unique: true,
                reason: `Creating a referral link for ${interaction.member.id}`,
            })
            .then(async (invite) => {
                await ReferralCode.create({
                    user_id: user.user_id,
                    code: invite.code,
                });

                await interaction.reply({
                    content: `Your referral link is:\`\`\`https://discord.gg/${invite.code}\`\`\``,
                    ephemeral: true,
                });
            });
        return;
    },
};
