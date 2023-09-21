const { Events } = require("discord.js");
const { sequelize, Lobby, User } = require("../models");

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) return;

			try {
				command.execute(interaction);
			} catch (error) {
				console.error(error);
				interaction.reply({
					content: "There was an error while executing this command!",
					ephemeral: true,
				});
			}
		} else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
				interaction.reply({
					content: "There was an error while executing this command!",
					ephemeral: true,
				});
			}
		} else if (interaction.isButton()) {
			await interaction.deferUpdate();
			//if its a lobby buttton
			const join_drop_regex = /join_|drop_/gm;
			if (join_drop_regex.test(interaction.customId)) {
				const idParts = interaction.customId.split("_");
				const lobby_id = idParts[1];
				const lobby = await Lobby.findOne({ where: { lobby_id: lobby_id } });
				await lobby.handleButton(interaction, idParts[0]);
			}

			const verify_regex = /verify_/gm;
			if (verify_regex.test(interaction.customId)) {
				const user_id = interaction.member.id;
				const user = await User.findOne({ where: { user_id: user_id } });
				await user.handleVerifyButton(interaction);
			}
		}
	},
};
