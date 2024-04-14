const { Draft } = require("../../models");

class DraftDTO {
    /**
     *
     * @param {Draft} draft
     */
    constructor(draft) {
        this.draft_id = draft.draft_id;
        this.match_id = draft.match_id;
        this.lobby_id = draft.lobby_id;
        this.host_id = draft.host_id;
        this.red_captain_id = draft.red_captain_id;
        this.blue_captain_id = draft.blue_captain_id;
        this.closed_at = draft.closed_at;
        this.message_id = draft.message_id;
        this.thread_id = draft.thread_id;
    }

    /**
     *
     * @returns {string}
     */
    toJSON() {
        return JSON.stringify(this);
    }
}

module.exports = DraftDTO;
