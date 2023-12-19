const {
	Embed,
	ActionRowBuilder,
	GuildChannel,
	Client,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require("discord.js");
const { channels } = require("../../../config.json");
const { ServerMessage } = require("../../models");
const { baseEmbed } = require("../embed");
const roles = require("../../../config.json").roles.game_roles[
	"League of Legends"
];
const client = require("../../client.js");

const leagueRoleSelectMessage = async () => {
	/** @type {GuildChannel} */
	const channel = client.guild.channels.cache.get(channels["roles"]);

	const currentMessage = await ServerMessage.findOne({
		where: { type: "LEAGUE_ROLE_SELECT" },
	});

	if (currentMessage) {
		try {
			const message = await channel.messages.fetch(currentMessage.message_id);
			return;
		} catch (err) {
			console.error(err);
			await generateMessage(currentMessage, channel);
		}
	} else {
		await generateMessage(currentMessage, channel);
	}

	async function generateMessage(currentMessage, channel) {
		const select = new StringSelectMenuBuilder()
			.setCustomId("league_role_selection")
			.setPlaceholder("Select your Primary and Secondary Roles")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("Top")
					.setValue(roles["top"])
					.setEmoji("1154957325828903012"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Jungle")
					.setValue(roles["jungle"])
					.setEmoji("1154957317339623485"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Mid")
					.setValue(roles["mid"])
					.setEmoji("1154957322045620246"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Bot")
					.setValue(roles["bot"])
					.setEmoji("1154957326890057728"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Support")
					.setValue(roles["support"])
					.setEmoji("1154957323991777320"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Fill")
					.setValue(roles["fill"])
					.setEmoji("1154957318363037849")
			)
			.setMaxValues(2)
			.setMinValues(2);
		const components = new ActionRowBuilder().addComponents(select);

		const embed = baseEmbed(
			"League of Legends Roles",
			"Select your Primary and Secondary Roles"
		);

		embed.addFields({
			name: "Information",
			value:
				"Primary and Secondary Roles are decided by the order in which you select them.\nYou can update your roles as much as you'd like.",
		});

		const newMessage = await channel.send({
			embeds: [embed],
			components: [components],
		});

		if (currentMessage) {
			currentMessage.message_id = newMessage.id;
			await currentMessage.save();
		} else {
			await ServerMessage.create({
				type: "LEAGUE_ROLE_SELECT",
				message_id: newMessage.id,
				channel_id: channel.id,
			});
		}
	}
};

module.exports = { leagueRoleSelectMessage };
