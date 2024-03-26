const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class InteractionLog extends Model {
		static createLog(interaction, elapsed_time) {
			let options = null;
			let name = null;
			if (interaction.commandName) {
				try {
					let subcommand = interaction.options.getSubcommand();
					name = interaction.commandName + subcommand;
				} catch {
					name = interaction.commandName;
				}

				if (interaction.options) {
					options = interaction.options.data.reduce((acc, option) => {
						acc[option.name] = option.value;
						return acc;
					}, {});
				}
			} else {
				name = interaction.customId;
				if (interaction.values) {
					options = interaction.values.reduce((acc, value) => {
						acc[value] = true;
						return acc;
					}, {});
				}
			}

			try {
				return InteractionLog.create({
					interaction: name,
					parameters: options,
					user_id: interaction.user.id,
					channel_id: interaction?.channel?.id,
					elapsed_time,
				});
			} catch {
				console.error("Failed to log interaction", name, options);
				return null;
			}
		}
	}
	InteractionLog.init(
		{
			interaction_log_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			interaction: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			parameters: {
				type: DataTypes.JSON,
				allowNull: true,
			},
			user_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			channel_id: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			elapsed_time: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "InteractionLog",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return InteractionLog;
};
