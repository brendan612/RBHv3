const { SlashCommandBuilder, Interaction, User } = require("../admin/index.js");
const ms = require("ms");
const { ModerationLog, sequelize } = require("../admin/index.js");
const { Op, literal } = require("sequelize");
const { baseEmbed } = require("../../components/embed.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ihbanned")
		.setDescription("Get a list of banned users from inhouses"),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const [users, results] = await sequelize.query(`
			SELECT DISTINCT bans.targeted_user_id, bans.ban_end
			FROM (
				SELECT targeted_user_id, created_at, duration as ban_end
				FROM ModerationLogs
				WHERE type = 'IHBAN'
				AND duration > NOW() -- Adjust based on your SQL dialect
			) AS bans
			LEFT JOIN (
				SELECT targeted_user_id, created_at AS unban_created_at
				FROM ModerationLogs
				WHERE type = 'IHUNBAN'
			) AS unbans ON bans.targeted_user_id = unbans.targeted_user_id AND unbans.unban_created_at < bans.ban_end
			WHERE unbans.targeted_user_id IS NULL;
		`);

		const banned_users = users.map((user) => {
			return {
				user_id: user.targeted_user_id,
				duration: user.ban_end,
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
