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
			SELECT 
				bans.targeted_user_id, 
				MAX(bans.created_at) as last_ban_time
			FROM 
				ModerationLogs AS bans
			LEFT JOIN 
				(
					SELECT 
						targeted_user_id, 
						MAX(created_at) AS last_unban_time
					FROM 
						ModerationLogs
					WHERE 
						type = 'IHUNBAN'
					GROUP BY 
						targeted_user_id
				) AS unbans 
			ON 
				bans.targeted_user_id = unbans.targeted_user_id
			WHERE 
				bans.type = 'IHBAN'
				AND bans.created_at > COALESCE(unbans.last_unban_time, '1970-01-01')
			GROUP BY 
				bans.targeted_user_id
			HAVING 
				MAX(bans.created_at) > NOW() -- Assuming the ban is still active
			ORDER BY 
				last_ban_time DESC;
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
