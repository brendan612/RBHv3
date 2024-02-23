const {
	SlashCommandBuilder,
	Interaction,
	User,
	userOption,
} = require("./index.js");

const UserService = require("../../dataManager/services/userService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("name-change")
		.setDescription("Change a user's name and tag line")
		.addUserOption(userOption("target", "Targeted User", true))
		.addStringOption((option) =>
			option
				.setName("summoner_name")
				.setDescription(
					"The user's new summoner name. Do not include the tag line."
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("tag_line")
				.setDescription("The user's new tag line.")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const target = interaction.options.getUser("target");
		const targetUser = await User.findByPk(target.id);
		const summoner_name = interaction.options.getString("summoner_name");
		let tag_line = interaction.options.getString("tag_line");
		if (tag_line.includes("#")) {
			const split = tag_line.split("#");
			tag_line = split[1];
		}

		if (!targetUser) {
			return await interaction.reply({
				content: "User not found!",
				ephemeral: true,
			});
		}

		const duplicateCheck = await User.findOne({
			where: {
				summoner_name,
				tag_line,
			},
		});

		if (duplicateCheck) {
			return await interaction.reply({
				content: `${summoner_name}#${tag_line} is already verified!`,
				ephemeral: true,
			});
		}

		await interaction.reply({
			content: `Changed \`\`${targetUser.summoner_name}#${targetUser.tag_line}\`\` to \`\`${summoner_name}#${tag_line}\`\``,
			ephemeral: true,
		});

		const userService = new UserService(targetUser);
		await userService.clearUserPuuid();
		await userService.updateUserRiotAccount(
			targetUser.user_id,
			summoner_name,
			tag_line
		);
	},
};
