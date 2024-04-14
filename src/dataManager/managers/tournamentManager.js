const { Tournament } = require("../../models");

class TournamentManager {
    constructor() {
        this.temporaryTournaments = new Map();
    }

    /**
     * Gets the temporary tournament for the user
     * @param {string} created_by
     * @returns {Promise<Tournament>}
     */
    getTemporaryTournament(created_by) {
        return this.temporaryTournaments.get(created_by);
    }

    /**
     * Begins the creation of a new tournament and stores it in the temporaryTournaments map
     * Does not persist the tournament to the database
     * @param {string} created_by
     * @param {string} name
     * @param {string} description
     */
    startTournamentCreation(created_by, name, description) {
        const tournament = Tournament.build({
            name,
            description,
            created_by,
            status: "SCHEDULED",
        });
        this.temporaryTournaments.set(created_by, tournament);
        console.log(tournament);
    }

    /**
     *
     * @param {string} created_by
     * @param {Date} registration_start_date
     * @param {Date} registration_end_date
     * @param {Date} start_date
     * @param {Date} end_date
     */
    addTournamentDates(created_by, registration_start_date, registration_end_date, start_date, end_date) {
        const tournament = this.temporaryTournaments.get(created_by);
        tournament.registration_start_date = registration_start_date;
        tournament.registration_end_date = registration_end_date;
        tournament.start_date = start_date;
        tournament.end_date = end_date;
    }

    addGameFormat(created_by, game_id, game_mode_id) {
        const tournament = this.temporaryTournaments.get(created_by);
        tournament.game_id = game_id;
        tournament.game_mode_id = game_mode_id;
    }

    addRegistrationType(created_by, registration_type) {
        const tournament = this.temporaryTournaments.get(created_by);
        tournament.registration_type = registration_type;
    }

    addType(created_by, type) {
        const tournament = this.temporaryTournaments.get(created_by);
        tournament.type = type;
    }
}

module.exports = new TournamentManager();
