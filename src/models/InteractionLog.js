const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class InteractionLog extends Model {
		static createLog(interaction, elapsed_time) {
			return InteractionLog.create({
				interaction: interaction.commandName,
				parameters: interaction.options.data.reduce((acc, option) => {
					acc[option.name] = option.value;
					return acc;
				}, {}),
				user_id: interaction.user.id,
				channel_id: interaction.channel.id,
				elapsed_time,
			});
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
				allowNull: false,
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
