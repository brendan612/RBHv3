const { Events, Interaction } = require("discord.js");
const config = require(`../../${process.env.CONFIG_FILE}`).roles;

const { ServerChannel } = require("../models");
const client = require("../index.js");

module.exports = {
    name: Events.ChannelUpdate,
    execute: async (oldChannel, newChannel) => {
        const serverChannel = await ServerChannel.findOne({
            where: {
                channel_id: newChannel.id,
            },
        });

        if (!serverChannel) return;

        serverChannel.name = newChannel.name;
        serverChannel.parent_id = newChannel.parentId;
        await serverChannel.save();
    },
};
