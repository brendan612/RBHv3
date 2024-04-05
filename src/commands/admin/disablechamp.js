const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	championAutocomplete,
	gameOption,
	lobbyOption,
	championOption,
	handleGameOption,
	handleLobbyOption,
	Draft,
	ModerationLog,
	handleChampionOption,
} = require("./index.js");

const ms = require("ms");
const {
	TimestampFormat,
	displayDateAsTimestamp,
} = require("../../utilities/timestamp.js");

const ChampionDraftService = require("../../dataManager/services/championDraftService.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("disablechamp")
		.setDescription("Toggle a champion's availability")
		.addStringOption(championOption())
		.addBooleanOption((option) =>
			option
				.setName("disable")
				.setDescription("Disable the champion")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("length")
				.setDescription("Length of ban. EX: 1d, 1w, 1m, 1y, 1d1h1m1s, etc.")
				.setRequired(true)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const duration = ms(interaction.options.getString("length"));
		const current_date = new Date();
		const expiration_date = new Date(current_date.getTime() + duration);

		const champion = await handleChampionOption(interaction, null, true);
		if (!champion) return;

		champion.enabled = !interaction.options.getBoolean("disable");
		await champion.save();

		await ModerationLog.createModerationLog(
			interaction.user.id,
			interaction.user.id,
			expiration_date,
			"TOGGLECHAMP",
			champion.champion_id
		);

		await interaction.reply({
			content: `${champion.name} is now ${
				champion.enabled
					? "enabled"
					: "disabled until " +
					  displayDateAsTimestamp(expiration_date, TimestampFormat.ShortDate)
			}`,
		});
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			gameAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "champion") {
			championAutocomplete(focusedValue.value, interaction);
		}
	},
};
