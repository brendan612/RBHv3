const { SlashCommandBuilder, Interaction } = require("./index.js");

const { User, userOption } = require("../admin/index.js");

const { getSummonerByRiotID } = require("../../api/riot/riotApiHandler");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("get-user")
		.setDescription("Get a User (RBH Data)")
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
				content: "Invalid User. Please try again.",
				ephemeral: true,
			});
		}

		const dbUser = await User.findByPk(user.id);

		if (!dbUser) {
			return await interaction.reply({
				content: "This user does not exist in this guild.",
				ephemeral: true,
			});
		}

		dbUser.puuid = dbUser.puuid.slice(0, 4) + "..." + dbUser.puuid.slice(-4);

		await interaction.reply({
			content: "```" + JSON.stringify(dbUser, null, 2) + "```",
		});
	},
};
