const { ActionRowBuilder } = require("discord.js");
const {
	SlashCommandBuilder,
	Interaction,
	User,
	userOption,
	regionOption,
	regionAutocomplete,
	handleRegionOption,
	handleUserOption,
} = require("./index.js");

const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("change-region")
		.setDescription("Change the region you are playing in")
		.addStringOption(regionOption())
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const region = await handleRegionOption(interaction);
		let user = await handleUserOption(interaction, "target");

		if (!hasRequiredRoleOrHigher(interaction.member, "admin")) {
			user = await User.findByPk(interaction.user.id);
		}

		if (user.region_id === region.region_id) {
			return await interaction.reply({
				content: "User is already in that region",
				ephemeral: true,
			});
		}

		await user.update({ region_id: region.region_id });

		return await interaction.reply({
			content: `Region updated for <@${user.user_id}> to ${region.region_id}`,
			ephemeral: true,
		});
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "region") {
			regionAutocomplete(focusedValue.value, interaction);
		}
	},
};
