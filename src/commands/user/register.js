const { ActionRowBuilder } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	userOption,
} = require("./index.js");
const UserService = require("../../dataManager/services/userService.js");

const channels = require(`../../../${process.env.CONFIG_FILE}`).channels;
module.exports = {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Register your discord account with the server."),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const user = await User.findOne({
			where: { user_id: interaction.member.id },
		});

		if (user) {
			return await interaction.reply({
				content: "You are already registered!",
				ephemeral: true,
			});
		} else {
			await UserService.createUser(
				interaction.member.id,
				interaction.member.joinedAt
			);

			return await interaction.reply({
				content:
					"You have been registered! You should now verify your account.\n" +
					`Go to <#${channels.verify}> and type \`\`/verify\`\` to get started.`,
				ephemeral: true,
			});
		}
	},
};
