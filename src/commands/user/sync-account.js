const { SlashCommandBuilder } = require("@discordjs/builders");
const { Interaction } = require("discord.js");
const { User, userOption } = require("../../commands/user/index.js");
const UserService = require("../../dataManager/services/userService.js");
const { hasRequiredRoleOrHigher } = require("../../utilities/utility-functions.js");

module.exports = {
    data: new SlashCommandBuilder().setName("sync-account").setDescription("Sync your RBH Profile with your Riot Account").addUserOption(userOption()),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        let userToUpdate = null;
        const targetUser = interaction.options.getUser("target");
        if (targetUser && targetUser.id !== interaction.member.id && !hasRequiredRoleOrHigher(interaction.member, "admin")) {
            return await interaction.reply({
                content: "You can only sync your own account",
                ephemeral: true,
            });
        }

        if (targetUser) {
            userToUpdate = await User.findByPk(targetUser.id);
        } else {
            userToUpdate = await User.findByPk(interaction.member.id);
        }

        if (!userToUpdate.verified) {
            return await interaction.reply({
                content: "You must be verified to use this command",
                ephemeral: true,
            });
        }

        const userService = new UserService(userToUpdate);
        const userDTO = await userService.syncUserRiotAccount(userToUpdate.user_id);
        await userToUpdate.reload();
        return await interaction.reply({
            content: `Your server profile has been updated to ${userToUpdate.summoner_name}#${userToUpdate.tag_line}`,
            ephemeral: true,
        });
    },
};
