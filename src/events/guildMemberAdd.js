const { Events } = require("discord.js");
const UserService = require("../dataManager/services/userService.js");

const { ReferralCode, Referral } = require("../models");

const client = require("../client.js");

module.exports = {
	name: Events.GuildMemberAdd,
	execute: async (member) => {
		const user = await UserService.createUser(member.id, member.joinedAt);

		const newInvites = await client.guild.invites.fetch();
		const oldInvites = client.invites;

		const usedInvite = newInvites.find((invite) => {
			const oldInviteUses = oldInvites.get(invite.code);
			return oldInviteUses && invite.uses > oldInviteUses;
		});

		if (usedInvite) {
			console.log(
				`New member joined: ${user.user_id} using invite: ${usedInvite.code}`
			);

			const referralCode = await ReferralCode.findOne({
				where: {
					code: usedInvite.code,
				},
			});

			if (referralCode) {
				const referral = await Referral.findOne({
					where: {
						user_id: user.user_id,
					},
				});

				if (!referral) {
					await Referral.create({
						referrer_id: referralCode.user_id,
						user_id: user.user_id,
						invite_code: usedInvite.code,
					});

					referralCode.uses += 1;
					await referralCode.save();
				}
			}

			newInvites.forEach((invite) => {
				client.invites.set(invite.code, invite.uses);
			});
		} else {
			console.log(`New member joined: ${user.user_id}`);
		}
	},
};
