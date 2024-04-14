const { SlashCommandBuilder, Interaction, User } = require("../admin/index.js");
const ms = require("ms");
const { ModerationLog, sequelize } = require("../admin/index.js");
const { Op, literal } = require("sequelize");
const { baseEmbed } = require("../../components/embed.js");

module.exports = {
    data: new SlashCommandBuilder().setName("ihbanned").setDescription("Get a list of banned users from inhouses"),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        const [users, results] = await sequelize.query(`
			SELECT *
			FROM ModerationLogs AS m
			WHERE m.type = 'IHBAN'
			AND m.duration > NOW()
			AND NOT EXISTS (
			SELECT 1
			FROM ModerationLogs AS unban
			WHERE unban.targeted_user_id = m.targeted_user_id
			AND unban.type = 'IHUNBAN'
			AND unban.created_at > m.created_at
			)
			ORDER BY m.created_at desc 
		`);

        const banned_users = users.map((user) => {
            return {
                user_id: user.targeted_user_id,
                duration: user.duration,
            };
        });

        if (!banned_users.length) {
            await interaction.reply({
                content: "No users are banned from inhouses",
                ephemeral: true,
            });
            return;
        }

        const embed = baseEmbed("Banned Users", "Users banned from inhouses");
        const banned_users_string = banned_users.map((user) => {
            const timestamp = Math.floor(new Date(user.duration).getTime() / 1000); //divide by 1000 to convert to seconds
            return `<@${user.user_id}> | Expires <t:${Math.floor(timestamp)}:R>\n`;
        });

        embed.addFields({
            name: "\r",
            value: banned_users_string.join(""),
        });

        return await interaction.reply({
            embeds: [embed],
        });
    },
};
