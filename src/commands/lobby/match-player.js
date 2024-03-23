const {
	SlashCommandBuilder,
	Interaction,
	lobbyAutocomplete,
	lobbyOption,
	handleLobbyOption,
	championAutocomplete,
	handleChampionOption,
	championOption,
	DraftRound,
} = require("./index.js");

const MatchService = require("../../dataManager/services/matchService.js");

const {
	hasRequiredRoleOrHigher,
} = require("../../utilities/utility-functions.js");
const { has } = require("config");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("match-player")
		.setDescription(
			"View information about a player in a match or update their information"
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("view")
				.setDescription("View information about a player in a match")
				.addIntegerOption(lobbyOption("lobby", "Lobby ID", true, true))
				.addUserOption((option) =>
					option.setName("player").setDescription("Player").setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("update")
				.setDescription("Update information about a player in a match")
				.addIntegerOption(lobbyOption("lobby", "Lobby ID", true, true))
				.addStringOption(championOption())
				.addStringOption((option) =>
					option
						.setName("role")
						.setDescription("Role")
						.setRequired(true)
						.addChoices(
							{ name: "Top", value: "Top" },
							{ name: "Jungle", value: "Jungle" },
							{ name: "Mid", value: "Mid" },
							{ name: "Bot", value: "Bot" },
							{ name: "Support", value: "Support" }
						)
				)
				.addUserOption((option) =>
					option.setName("player").setDescription("Player").setRequired(false)
				)
		),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === "view") {
			const lobby = await handleLobbyOption(interaction);
			if (!lobby) return await interaction.reply("Lobby not found");

			const match = await MatchService.getMatch(lobby.match_id);
			if (!match)
				return await interaction.reply(
					"This lobby has no match associated with it"
				);

			const player = interaction.options.getUser("player");
			if (!match.MatchPlayers.find((mp) => mp.user_id === player.id))
				return await interaction.reply("Player not found in this match");

			const matchPlayer = match.MatchPlayers.find(
				(mp) => mp.user_id === player.id
			);

			return await interaction.reply({
				content: `Player: <@${player.id}>\nTeam: ${matchPlayer.team}\nRole: ${matchPlayer.role}\nChampion: ${matchPlayer.champion_id}`,
			});
		} else if (interaction.options.getSubcommand() === "update") {
			const lobby = await handleLobbyOption(interaction);
			if (!lobby) return await interaction.reply("Lobby not found");

			const match = await MatchService.getMatch(lobby.match_id);
			if (!match) {
				return await interaction.reply(
					"This lobby has no match associated with it"
				);
			}

			const user = interaction.options.getUser("player") ?? interaction.user;

			const matchPlayer = match.MatchPlayers.find(
				(mp) => mp.user_id === user.id
			);

			if (!matchPlayer) {
				return await interaction.reply("Player not found in this match");
			}

			if (!hasRequiredRoleOrHigher(interaction.member, "moderator")) {
				return await interaction.reply(
					"You do not have permission to update this player's information"
				);
			}

			const champion = await handleChampionOption(
				interaction,
				lobby.draft_id,
				true
			);
			console.log(champion.id);
			const draftRound = await DraftRound.findOne({
				where: {
					draft_id: lobby.draft_id,
					champion_id: champion.champion_id,
				},
			});

			if (!draftRound) {
				return await interaction.reply("Champion not found in this draft");
			}

			const takenChamp = match.MatchPlayers.some(
				(mp) => mp.champion_id === champion.champion_id
			);

			if (takenChamp) {
				return await interaction.reply(
					"Champion already taken. If you need to swap champions, please contact a moderator."
				);
			}

			const role = interaction.options.getString("role");

			const takenRole = match.MatchPlayers.some(
				(mp) => mp.role === role && mp.team === matchPlayer.team
			);

			if (takenRole) {
				return await interaction.reply(
					"Role already taken. If you need to swap roles, please contact a moderator."
				);
			}

			await matchPlayer.update({
				champion_id: champion.champion_id,
				role: role,
			});

			return await interaction.reply({
				content: `Player: <@${user.id}>\nTeam: ${matchPlayer.team}\nRole: ${matchPlayer.role}\nChampion: ${matchPlayer.champion_id}`,
			});
		}
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "lobby") {
			lobbyAutocomplete(focusedValue.value, interaction);
		} else if (focusedValue.name === "champion") {
			championAutocomplete(focusedValue.value, interaction);
		}
	},
};
