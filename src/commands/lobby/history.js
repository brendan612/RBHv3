const {
	SlashCommandBuilder,
	Interaction,
	gameAutocomplete,
	userOption,
	baseEmbed,
	Lobby,
	User,
	Game,
	Match,
	MatchPlayer,
	Season,
	Sequelize,
	sequelize,
} = require("./index.js");
const { Op } = require("sequelize");
const {
	TimestampFormat,
	displayDateAsTimestamp,
} = require("../../utilities/timestamp.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const {
	getTotalMatchesForUser,
	getTotalMatchesForServer,
	getMatchHistoryForUser,
	getMatchHistoryForServer,
	getHostsForMatches,
	getMatchPlayersForMatchesAndUser,
} = require("../../dataManager/queries/lobbies/lobby.js");

const pageSize = 10;

module.exports = {
	data: new SlashCommandBuilder()
		.setName("history")
		.setDescription("View lobby history of the server or a user")
		.addUserOption(userOption()),
	/**
	 *
	 * @param {Interaction} interaction
	 * @param {int} page
	 * @param {string} target_id
	 * @param {Interaction} commandInteraction
	 */
	async execute(
		interaction,
		page = 1,
		target_id = null,
		commandInteraction = null
	) {
		try {
			if (interaction.isButton()) {
				await interaction.deferUpdate();
			} else {
				await interaction.deferReply();
			}

			commandInteraction = commandInteraction ?? interaction;

			let user = null;
			if (target_id) {
				if (target_id == "server") {
					target_id = null;
				} else {
					user = interaction.guild.members.cache.get(target_id);
				}
			} else {
				try {
					user = user = interaction.guild.members.cache.get(
						interaction.options.getUser("target").id
					);
				} catch {}
			}
			let targetString = "server";
			if (user) {
				targetString = user.id.toString();
			}

			const serverTarget = targetString == "server";

			const embed = baseEmbed(
				`Lobby History for ${user ? `${user.nickname}` : "Server"}`,
				"Recent League of Legends lobbies."
			);

			const currentSeason = await Season.getCurrentSeason();

			let totalmatches = serverTarget
				? await getTotalMatchesForServer(1, currentSeason.season_id)
				: await getTotalMatchesForUser(
						targetString,
						1,
						currentSeason.season_id
				  );
			let matches = serverTarget
				? await getMatchHistoryForServer(
						1,
						currentSeason.season_id,
						page,
						pageSize
				  )
				: await getMatchHistoryForUser(
						targetString,
						1,
						currentSeason.season_id,
						page,
						pageSize
				  );

			if (matches === null || matches.length == 0) {
				return interaction.editReply({
					embeds: [
						baseEmbed(
							`Lobby History for ${user ? `${user.nickname}` : "Server"}`,
							"No matches found."
						),
					],
				});
			}

			embed.addFields({
				name: "Lobby ID",
				value: matches
					.map((match) => {
						const winning_team =
							match.winning_team == "red" ? ":red_circle:" : ":blue_circle:";
						return `#${match.lobby_id} ${winning_team}`;
					})
					.join("\n"),
				inline: true,
			});

			embed.addFields({
				name: "Match Date",
				value: matches
					.map((match) =>
						displayDateAsTimestamp(
							new Date(match.end_time),
							TimestampFormat.ShortDate
						)
					)
					.join("\n"),
				inline: true,
			});

			const match_ids = matches.map((match) => match.match_id);

			if (serverTarget) {
				const hosts = await getHostsForMatches(match_ids);
				embed.addFields({
					name: "Host",
					value: hosts.join("\n"),
					inline: true,
				});
			} else {
				const results = await getMatchPlayersForMatchesAndUser(
					match_ids,
					user.id
				);
				embed.addFields({
					name: "Win/Loss",
					value: results
						.map((result) => {
							let resultString = "";
							if (result.MatchPlayers[0].elo_change > 0) {
								resultString = ":white_check_mark:";
							} else {
								resultString = ":x:";
							}
							return resultString + " " + result.MatchPlayers[0].elo_change;
						})
						.join("\n"),
					inline: true,
				});
			}

			const totalPages = Math.ceil(totalmatches / pageSize);

			embed.setFooter({ text: `Page ${page} of ${totalPages}` });

			const components = new ActionRowBuilder();
			let hasComponents = false;

			if (page <= totalPages && page > 2) {
				hasComponents = true;
				const button = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel("<<")
					.setCustomId(`history_${1}_${targetString}`);
				components.addComponents(button);
			}
			if (page <= totalPages && page > 1) {
				hasComponents = true;
				const button = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel("<")
					.setCustomId(`history_${parseInt(page - 1)}_${targetString}`);
				components.addComponents(button);
			}
			if (page < totalPages) {
				hasComponents = true;
				const button = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(">")
					.setCustomId(`history_${parseInt(page + 1)}_${targetString}`);
				components.addComponents(button);
			}
			if (page < totalPages - 2) {
				hasComponents = true;
				const button = new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(">>")
					.setCustomId(`history_${totalPages}_${targetString}`);
				components.addComponents(button);
			}

			let message = null;

			message = await commandInteraction.editReply({
				embeds: [embed],
				components: hasComponents ? [components] : [],
			});

			try {
				const filter = (i) => i.user.id === interaction.user.id;
				const i = await message.awaitMessageComponent({ filter, time: 60000 });
				const customId = i.customId;
				const split = customId.split("_");
				const page = parseInt(split[1]);
				const button_target = split[2];
				this.execute(i, page, button_target, commandInteraction);
			} catch {
				try {
					message.edit({
						embeds: [embed],
						components: [],
					});
				} catch {}
			}
		} catch (error) {
			console.log(error);
		}
	},
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused(true);
		if (focusedValue.name === "game") {
			await gameAutocomplete(focusedValue.value, interaction);
		}
	},
};
