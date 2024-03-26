const { User } = require("../../models/index.js");

class UserDTO {
	/**
	 *
	 * @param {User} user
	 */
	constructor(user) {
		this.user_id = user.user_id;
		this.summoner_name = user.summoner_name;
		this.tag_line = user.tag_line;
		this.verified = user.verified;
		this.puuid = user.puuid;
		this.server_experience = user.server_experience;
		this.server_money = user.server_money;
		this.join_date = user.join_date;
		this.last_daily_date = user.last_daily_date;
		this.vote_streak = user.vote_streak;
		this.last_vote_date = user.last_vote_date;
		this.last_message_date = user.last_message_date;
		this.region_id = user.region_id;
	}
}

module.exports = UserDTO;
