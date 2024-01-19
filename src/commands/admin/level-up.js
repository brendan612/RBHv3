const { SlashCommandBuilder, Interaction, User } = require("./index.js");
const UserService = require("../../dataManager/services/userService.js");
const UserLevelManager = require("../../dataManager/managers/userLevelManager.js");
const { user } = require("../../client.js");
module.exports = {
	data: new SlashCommandBuilder()
		.setName("level-up")
		.setDescription("Manually level up a user")
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("User to level up")
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setName("amount")
				.setDescription("Amount of levels to level up")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user_id = interaction.user.id;
		const amount = interaction.options.getInteger("amount");
		const userService = await UserService.createUserService(user_id);
		const userLevelManager = new UserLevelManager();

		await interaction.deferReply();

		for (let i = 0; i < amount; i++) {
			const expToLevelUp = userLevelManager.expForNextLevel(
				userService.user.server_level
			);

			userService.user.server_experience += expToLevelUp + 1;
			userService.user.server_level++;

			await userLevelManager.assignLevelRole(
				user_id,
				userService.user.server_level
			);
		}

		await userService.user.save();

		function sleep(ms) {
			return new Promise((resolve) => {
				setTimeout(resolve, ms);
			});
		}

		await interaction.editReply({
			content: `<@${user_id}> leveled up ${amount} times`,
		});
	},
};
