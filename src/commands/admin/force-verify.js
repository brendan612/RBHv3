const { SlashCommandBuilder, Interaction } = require("./index.js");
const { getSummonerByRiotID } = require("../../api/riot/riotApiHandler");
const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("force-verify")
		.setDescription("Force verify a user")
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("The user to verify")
				.setRequired(true)
		)
		.addStringOption((option) => {
			return option
				.setName("game-name")
				.setDescription("The user's game name")
				.setRequired(true);
		})
		.addStringOption((option) => {
			return option
				.setName("tag-line")
				.setDescription("The user's tag line. Ex: 1234")
				.setRequired(true);
		}),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply({
			ephemeral: true,
		});
		const target_user = interaction.options.getUser("user");
		const game_name = interaction.options.getString("game-name");
		const tag_line = interaction.options.getString("tag-line");

		const summoner = await getSummonerByRiotID(game_name, tag_line);
		if (!summoner) {
			return await interaction.reply({
				content: "User not found",
				ephemeral: true,
			});
		}

		const userService = await UserService.createUserService(target_user.id);

		await userService.verifyUser(
			target_user.id,
			game_name,
			tag_line,
			summoner.puuid
		);

		return await interaction.editReply({
			content: `<@${target_user.id}> has been verified.`,
			ephemeral: true,
		});
	},
};
