const {
	SlashCommandBuilder,
	Interaction,
	gameOption,
	gameAutocomplete,
	handleGameOption,
	regionAutocomplete,
	regionOption,
	handleRegionOption,
} = require("./index.js");
const { ServerChannel } = require("../../models/index.js");

const client = require("../../client.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("server-channel")
		.setDescription("Manage server channels")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new server channel.")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("The type of channel")
						.setRequired(true)
						.addChoices(
							{
								name: "Voice",
								value: "2",
							},
							{
								name: "Text",
								value: "0",
							},
							{
								name: "Category",
								value: "4",
							}
						)
				)
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("The name of the channel")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("channel_id")
						.setDescription("The ID of the channel")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("purpose")
						.setDescription("The purpose the channel is for")
						.setRequired(true)
				)
				.addStringOption(gameOption())
				.addStringOption(regionOption())
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("view")
				.setDescription("View a server channel.")
				.addStringOption((option) =>
					option
						.setName("channel_id")
						.setDescription("The ID of the channel")
						.setRequired(true)
				)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "create") {
			const type = interaction.options.getString("type");
			const name = interaction.options.getString("name");
			const channel_id = interaction.options.getString("channel_id");
			const purpose = interaction.options.getString("purpose");
			const game = await handleGameOption(interaction);
			const region = await handleRegionOption(interaction);

			const existingCheck = await ServerChannel.findOne({
				where: { channel_id },
			});

			if (existingCheck) {
				return interaction.reply({
					content: `Channel already exists`,
					ephemeral: true,
				});
			}

			const serverChannel = await ServerChannel.create({
				type,
				name,
				channel_id,
				purpose,
				game_id: game.game_id,
				region_id: region.region_id,
			});

			client.serverChannels = await ServerChannel.findAll();

			return interaction.reply({
				content: `Server Channel created`,
				ephemeral: true,
			});
		} else if (interaction.options.getSubcommand() === "view") {
			const channel_id = interaction.options.getString("channel_id");

			const serverChannel = await ServerChannel.findOne({
				where: { channel_id },
			});

			if (!serverChannel) {
				return interaction.reply({
					content: `Channel not found`,
					ephemeral: true,
				});
			}

			return interaction.reply({
				content: `Server Channel: ${serverChannel.name}\n\`\`\`${JSON.stringify(
					serverChannel,
					null,
					2
				)}\`\`\``,
				ephemeral: true,
			});
		}
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "region") {
			regionAutocomplete(focusedValue.value, interaction);
		}
	},
};
