const PlayerDraftManager = require("../playerDraftManager");

class PlayerDraftManagerFactory {
	constructor() {
		this.draftManagers = new Map();
	}

	getPlayerDraftManager(draft_id) {
		if (!this.draftManagers.has(draft_id)) {
			this.draftManagers.set(draft_id, new PlayerDraftManager(draft_id));
		}
		return this.draftManagers.get(draft_id);
	}
}

module.exports = new PlayerDraftManagerFactory();
