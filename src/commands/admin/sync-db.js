const {
	SlashCommandBuilder,
	Interaction,
	sequelize,
	Game,
	User,
	Season,
} = require("./index.js");
module.exports = {
	data: new SlashCommandBuilder()
		.setName("sync-db")
		.setDescription("Sync the database and associated models")
		.addBooleanOption((option) => {
			return option
				.setName("force")
				.setDescription("Wipe the database")
				.setRequired(false);
		})
		.addBooleanOption((option) => {
			return option
				.setName("alter")
				.setDescription("Alter the database")
				.setRequired(false);
		}),
	/**
	 *
	 * @param {Interaction} interaction
	 */
	async execute(interaction) {
		const force = interaction.options.getBoolean("force");

		//only allow me to force wipe the database
		if (interaction.member.id !== "105858401497546752") {
			force = false;
		}

		await interaction.deferReply({ ephemeral: true });

		try {
			if (interaction.options.getBoolean("alter")) {
				console.log("Altering database");
				await sequelize.sync({ alter: true }).then(async () => {
					console.log("Database altered");
					await interaction.editReply({
						content: `Database altered`,
						ephemeral: true,
					});
				});
				return;
			}

			console.log("Syncing database");
			await sequelize.sync({ force: force }).then(async () => {
				console.log("Database synced");
				await interaction.editReply({
					content: `Database synced` + (force ? " with force" : ""),
					ephemeral: true,
				});

				if (force) {
					const game = await Game.createGame("League of Legends");
					const game2 = await Game.createGame("Valorant");
					const game3 = await Game.createGame("Teamfight Tactics");
					// const me = await User.createUser(105858401497546752, new Date());
					// const smurf = await User.createUser(669049432473600021, new Date());
					// const shilling = await User.createUser(
					// 	678067592673493005,
					// 	new Date()
					// );
					// shilling.summoner_name = "10Shilling6Pence";
					// await shilling.save();
					// me.summoner_name = "Simuna";
					// await me.save();
					// smurf.summoner_name = "TheReal2Trick";
					// await smurf.save();
					// for (let i = 0; i < 13; i++) {
					// 	const dummy = await User.createUser(i + 1, new Date());
					// 	dummy.summoner_name = "Dummy " + (i + 1);
					// 	await dummy.save();
					// }
				}
			});
		} catch (e) {
			console.log(e);
			await interaction.editReply({
				content: "Failed to sync database",
				ephemeral: true,
			});
		}
	},
};
