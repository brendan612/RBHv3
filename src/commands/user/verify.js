const {
	SlashCommandBuilder,
	Interaction,
	User,
	userOption,
} = require("./index.js");
const UserService = require("../../dataManager/services/userService.js");
const channels = require(`../../../${process.env.CONFIG_FILE}`).channels;
const client = require("../../client.js");
module.exports = {
	data: new SlashCommandBuilder()
		.setName("verify")
		.setDescription("Verify your account and link with your Riot ID")
		.addStringOption((option) => {
			return option
				.setName("game-name")
				.setDescription("Your game name")
				.setRequired(true);
		})
		.addStringOption((option) => {
			return option
				.setName("tag-line")
				.setDescription("Your tag line. Ex: 1234")
				.setRequired(true);
		})
		.addUserOption((option) =>
			userOption("referrer", "Referrer (optional)", false)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.channelId !== channels.verify) {
			return await interaction.reply({
				content: `Please use <#${channels.verify}> to verify your account.`,
				ephemeral: true,
			});
		}

		const game_name = interaction.options.getString("game-name");
		let tag_line = interaction.options.getString("tag-line");
		if (tag_line.includes("#")) {
			const split = tag_line.split("#");
			tag_line = split[1];
		}
		const referrer = interaction.options.getUser("referrer") ?? null;
		let user = await User.findByPk(interaction.member.id);

		if (!user) {
			user = UserService.createUser(
				interaction.member.id,
				interaction.member.joinedAt
			);
		}

		const duplicateCheck = await User.findOne({
			where: {
				summoner_name: game_name,
				tag_line: tag_line,
			},
		});

		if (duplicateCheck) {
			return await interaction.reply({
				content: "This account has already been verified!",
				ephemeral: true,
			});
		}

		if (user.verified) {
			return await interaction.reply({
				content: "You are already verified!",
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const userService = new UserService(user);
		await userService.generateVerifyEmbed(
			user.user_id,
			game_name,
			tag_line,
			referrer
		);
		return;
	},
};
