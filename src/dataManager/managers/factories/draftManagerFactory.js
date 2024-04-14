const DraftManager = require("../draftManager");

class DraftManagerFactory {
    constructor() {
        this.draftManagers = new Map();
    }

    getDraftManager(draft_id) {
        if (!this.draftManagers.has(draft_id)) {
            this.draftManagers.set(draft_id, new DraftManager(draft_id));
        }
        return this.draftManagers.get(draft_id);
    }
}

module.exports = new DraftManagerFactory();
