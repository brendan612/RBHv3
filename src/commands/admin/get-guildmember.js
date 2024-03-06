const { SlashCommandBuilder, Interaction } = require("./index.js");

const { User, userOption } = require("../admin/index.js");
const { getSummonerByRiotID } = require("../../api/riot/riotApiHandler");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("get-guildmember")
		.setDescription("Get a guild member (Discord User)")
		.addUserOption(userOption())
		.addStringOption((option) =>
			option
				.setName("id")
				.setDescription("The User's Discord ID")
				.setRequired(false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		let user = interaction.options.getUser("target");

		if (!user) {
			user = await interaction.guild.members.fetch(
				interaction.options.getString("id")
			);
		}

		if (!user) {
			return await interaction.reply({
				content: "This user does not exist in this guild.",
				ephemeral: true,
			});
		}

		await interaction.reply({
			content: "```" + JSON.stringify(user, null, 2) + "```",
		});
	},
};
