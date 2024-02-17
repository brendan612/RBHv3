const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
	class AutoResponse extends Model {}
	AutoResponse.init(
		{
			auto_response_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
				unique: true,
				autoIncrement: true,
			},
			trigger: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			response: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			created_by: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "AutoResponse",
			createdAt: "created_at",
			updatedAt: "updated_at",
		}
	);

	return AutoResponse;
};