const { ActionRowBuilder } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	userOption,
} = require("./index.js");
module.exports = {
	data: new SlashCommandBuilder()
		.setName("opgg")
		.setDescription(
			"Get a link to a players op.gg profile. Will default to yourself"
		)
		.addStringOption((option) => {
			return option
				.setName("summoner_name")
				.setDescription("Summoner name to search for")
				.setRequired(true);
		})
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user = await User.findOne({
			where: { user_id: interaction.member.id },
		});
		const summoner_name = interaction.options.getString("summoner_name");
		const target = interaction.options.getUser("target") ?? null;

		const baseURL = `https://www.op.gg/summoners`;
		if (summoner_name) {
			return await interaction.reply({
				content: `${baseURL}/NA/${summoner_name}`,
				ephemeral: true,
			});
		} else if (target !== null) {
			let user = await User.findOne({
				where: { user_id: target.id },
			});
			if (user && user.verified && user.summoner_name) {
				return await interaction.reply({
					content: `${baseURL}/${user.region}/${user.summoner_name}`,
					ephemeral: true,
				});
			}
		}

		return await interaction.reply({
			content: "Could not find a user with that name",
			ephemeral: true,
		});
	},
};
