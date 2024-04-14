const { SlashCommandBuilder, Interaction, gameAutocomplete } = require("./index.js");
const { ServerChannel, ServerEmoji, ServerRole, ServerSetting, Sequelize } = require("../../models/index.js");

const { gameOption, handleGameOption } = require("../admin");

const { Op } = require("sequelize");
const client = require("../../client.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Manage server config")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create-setting")
                .setDescription("Create a new server setting")
                .addStringOption((option) =>
                    option.setName("category").setDescription("Category of the setting").setRequired(true).addChoices(
                        {
                            name: "Channel",
                            value: "channel",
                        },
                        {
                            name: "Role",
                            value: "role",
                        },
                        {
                            name: "Emoji",
                            value: "emoji",
                        },
                        {
                            name: "Setting",
                            value: "setting",
                        },
                    ),
                )
                .addStringOption((option) => option.setName("type").setDescription("Type of the setting").setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName("name").setDescription("Name of the setting").setRequired(true))
                .addStringOption((option) => option.setName("value").setDescription("Value of the setting").setRequired(true))
                .addStringOption(gameOption()),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("update-setting")
                .setDescription("Update a server setting")
                .addStringOption((option) =>
                    option.setName("category").setDescription("Category of the setting").setRequired(true).addChoices(
                        {
                            name: "Channel",
                            value: "channel",
                        },
                        {
                            name: "Role",
                            value: "role",
                        },
                        {
                            name: "Emoji",
                            value: "emoji",
                        },
                        {
                            name: "Setting",
                            value: "setting",
                        },
                    ),
                )
                .addStringOption((option) => option.setName("type").setDescription("Type of the setting").setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName("name").setDescription("Name of the setting").setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName("value").setDescription("Updated value of the setting").setRequired(true)),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("delete-setting")
                .setDescription("Delete a server setting")
                .addStringOption((option) =>
                    option.setName("category").setDescription("Category of the setting").setRequired(true).addChoices(
                        {
                            name: "Channel",
                            value: "channel",
                        },
                        {
                            name: "Role",
                            value: "role",
                        },
                        {
                            name: "Emoji",
                            value: "emoji",
                        },
                        {
                            name: "Setting",
                            value: "setting",
                        },
                    ),
                )
                .addStringOption((option) => option.setName("type").setDescription("Type of the setting").setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName("name").setDescription("Name of the setting").setRequired(true).setAutocomplete(true)),
        ),
    /**
     *
     * @param {Interaction} interaction
     */
    async execute(interaction) {
        if (interaction.options.getSubcommand() === "create-setting") {
            const category = interaction.options.getString("category");
            const type = interaction.options.getString("type");
            const name = interaction.options.getString("name");
            const value = interaction.options.getString("value");

            const game = await handleGameOption(interaction, true);

            let result = null;

            switch (category) {
                case "channel": {
                    result = await ServerChannel.findOrCreate({
                        where: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        defaults: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id,
                        },
                    });
                    break;
                }
                case "role": {
                    result = await ServerRole.findOrCreate({
                        where: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        defaults: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                    });
                    break;
                }
                case "emoji": {
                    result = await ServerEmoji.findOrCreate({
                        where: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        defaults: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                    });
                    break;
                }
                case "setting": {
                    result = await ServerSetting.findOrCreate({
                        where: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        defaults: {
                            type,
                            name,
                            value,
                            game_id: game?.game_id ?? null,
                        },
                    });
                    break;
                }
            }

            await interaction.reply({
                content: `Created\n\`\`\`json\n${JSON.stringify(result)}\n\`\`\``,
            });
        } else if (interaction.options.getSubcommand() === "update-setting") {
            const category = interaction.options.getString("category");
            const type = interaction.options.getString("type");
            const name = interaction.options.getString("name");
            const value = interaction.options.getString("value");
            const game = await handleGameOption(interaction, true);

            let result = null;
            switch (category) {
                case "channel":
                    result = await ServerChannel.update(
                        {
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        {
                            where: {
                                type,
                                name,
                            },
                        },
                    );
                    break;
                case "role":
                    result = await ServerRole.update(
                        {
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        {
                            where: {
                                type,
                                name,
                            },
                        },
                    );
                    break;
                case "emoji":
                    result = await ServerEmoji.update(
                        {
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        {
                            where: {
                                type,
                                name,
                            },
                        },
                    );
                    break;
                case "setting":
                    result = await ServerSetting.update(
                        {
                            value,
                            game_id: game?.game_id ?? null,
                        },
                        {
                            where: {
                                type,
                                name,
                            },
                        },
                    );
                    break;
            }

            await interaction.reply({
                content: `Updated\n\`\`\`json\n${JSON.stringify(result)}\n\`\`\``,
            });
        } else if (interaction.options.getSubcommand() === "delete-setting") {
            const category = interaction.options.getString("category");
            const type = interaction.options.getString("type");
            const name = interaction.options.getString("name");

            let result = null;

            switch (category) {
                case "channel":
                    result = await ServerChannel.destroy({
                        where: {
                            type,
                            name,
                        },
                    });
                    break;
                case "role":
                    result = await ServerRole.destroy({
                        where: {
                            type,
                            name,
                        },
                    });
                    break;
                case "emoji":
                    result = await ServerEmoji.destroy({
                        where: {
                            type,
                            name,
                        },
                    });
                    break;
                case "setting":
                    result = await ServerSetting.destroy({
                        where: {
                            type,
                            name,
                        },
                    });
                    break;
            }

            await interaction.reply({
                content: `Deleted\n\`\`\`json\n${JSON.stringify(result)}\n\`\`\``,
            });
        }
    },
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        const category = interaction.options.getString("category");

        if (!category) {
            return await interaction.respond({});
        }
        if (focusedValue.name === "type") {
            switch (category) {
                case "channel": {
                    const types = await ServerChannel.findAll({
                        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("type")), "type"]],
                        where: {
                            type: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        types.map((type) => ({
                            name: type.type,
                            value: type.type,
                        })),
                    );
                    break;
                }
                case "role": {
                    const types = await ServerRole.findAll({
                        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("type")), "type"]],
                        where: {
                            type: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        types.map((type) => ({
                            name: type.type,
                            value: type.type,
                        })),
                    );
                    break;
                }
                case "emoji": {
                    const types = await ServerEmoji.findAll({
                        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("type")), "type"]],
                        where: {
                            type: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        types.map((type) => ({
                            name: type.type,
                            value: type.type,
                        })),
                    );
                    break;
                }
                case "setting": {
                    const types = await ServerSetting.findAll({
                        attributes: [[Sequelize.fn("DISTINCT", Sequelize.col("type")), "type"]],
                        where: {
                            type: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        types.map((type) => ({
                            name: type.type,
                            value: type.type,
                        })),
                    );
                    break;
                }
            }
        } else if (focusedValue.name === "name") {
            switch (category) {
                case "channel": {
                    const names = await ServerChannel.findAll({
                        where: {
                            name: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        names.map((name) => ({
                            name: name.name,
                            value: name.name,
                        })),
                    );
                    break;
                }
                case "role": {
                    const names = await ServerRole.findAll({
                        where: {
                            name: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        names.map((name) => ({
                            name: name.name,
                            value: name.name,
                        })),
                    );
                    break;
                }
                case "emoji": {
                    const names = await ServerEmoji.findAll({
                        where: {
                            name: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        names.map((name) => ({
                            name: name.name,
                            value: name.name,
                        })),
                    );
                    break;
                }
                case "setting": {
                    const names = await ServerSetting.findAll({
                        where: {
                            name: {
                                [Op.like]: `%${focusedValue.value}%`,
                            },
                        },
                    });

                    await interaction.respond(
                        names.map((name) => ({
                            name: name.name,
                            value: name.name,
                        })),
                    );
                    break;
                }
            }
        } else if (focusedValue.name === "game") {
            gameAutocomplete(focusedValue.value, interaction);
        }
    },
};
