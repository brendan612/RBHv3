const client = require("../../client.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Draft } = require("../../models");

/**
 *
 * @param {Draft} draft
 * @returns
 */
async function generateWinInputComponents(draft, confirmTeam = null) {
	const draftManager = client.managers.draftManagerFactory.getDraftManager(
		draft.draft_id
	);

	const actionRow = new ActionRowBuilder();

	draftManager.showRedConfirm = confirmTeam === "red";
	draftManager.showBlueConfirm = confirmTeam === "blue";

	if (confirmTeam) {
		const cancelButton = new ButtonBuilder()
			.setCustomId(`cancelwin_${draft.draft_id}`)
			.setStyle(ButtonStyle.Secondary)
			.setLabel("Cancel");

		actionRow.addComponents(cancelButton);
	}

	if (!draftManager.showRedConfirm && !draftManager.showBlueConfirm) {
		const redWinButton = new ButtonBuilder()
			.setCustomId(`redwin_${draft.draft_id}`)
			.setStyle(ButtonStyle.Danger)
			.setLabel("Red Win");

		const blueWinButton = new ButtonBuilder()
			.setCustomId(`bluewin_${draft.draft_id}`)
			.setStyle(ButtonStyle.Primary)
			.setLabel("Blue Win");

		actionRow.addComponents(redWinButton);
		actionRow.addComponents(blueWinButton);
	} else if (draftManager.showRedConfirm) {
		const redConfirmButton = new ButtonBuilder()
			.setCustomId(`redwinconfirm_${draft.draft_id}`)
			.setStyle(ButtonStyle.Success)
			.setLabel("Confirm Red Win");

		actionRow.addComponents(redConfirmButton);
	} else if (draftManager.showBlueConfirm) {
		const blueConfirmButton = new ButtonBuilder()
			.setCustomId(`bluewinconfirm_${draft.draft_id}`)
			.setStyle(ButtonStyle.Success)
			.setLabel("Confirm Blue Win");

		actionRow.addComponents(blueConfirmButton);
	}

	return actionRow;
}

module.exports = {
	generateWinInputComponents,
};
