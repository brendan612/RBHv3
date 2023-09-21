const { ActionRowBuilder } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	Referral,
	userOption,
} = require("./index.js");
module.exports = {
	data: new SlashCommandBuilder()
		.setName("verify")
		.setDescription("Verify your account and link with your summoner name")
		.addStringOption((option) => {
			return option
				.setName("summoner_name")
				.setDescription("Your summoner name")
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
		const summoner_name = interaction.options.getString("summoner_name");
		let user = await User.findOne({
			where: { user_id: interaction.member.id },
		});

		const { embed, verifyButton } = user.generateVerifyEmbed(summoner_name);
		const row = new ActionRowBuilder().addComponents(verifyButton);
		await interaction.reply({
			embeds: [embed],
			components: [row],
			ephemeral: false,
		});

		// if (!user) {
		// 	try {
		// 		user = await User.create({
		// 			user_id: interaction.member.id,
		// 			join_date: interaction.member.joinedAt,
		// 			summoner_name: summoner_name,
		// 		});
		// 	} catch (err) {
		// 		console.log(err);
		// 	}
		// }

		// interaction.member.setNickname(summoner_name);

		// const referrer = interaction.options.getUser("referrer") || null;
		// if (referrer) {
		// 	await Referral.createReferral(user.user_id, referrer.id);
		// }
	},
};
