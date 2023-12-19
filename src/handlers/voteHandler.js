const express = require("express");
const Topgg = require("@top-gg/sdk");
const webhook = new Topgg.Webhook();
const { User } = require("../models");
const { client } = require("../client");

const app = express();

app.post(
	"/dslwebhook",
	webhook.listener(async (vote) => {
		const user = await User.findOne({ where: { user_id: vote.user } });
		if (user) {
			await user.awardVoteMoney(vote, client);
		} else {
			console.log("User not found");
		}
	})
);

module.exports = {
	start() {
		app.listen(5000, () => {});
	},
};
