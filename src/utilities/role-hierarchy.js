const permission_roles = require("../../config.json").roles.permission_roles;

const roleHierarchy = {
	owner: [
		permission_roles["knave"],
		permission_roles["admin"],
		permission_roles["moderator"],
		permission_roles["trainee"],
		permission_roles["verified"],
	],
	knave: [
		permission_roles["admin"],
		permission_roles["moderator"],
		permission_roles["trainee"],
		permission_roles["verified"],
	],
	admin: [
		permission_roles["moderator"],
		permission_roles["trainee"],
		permission_roles["verified"],
	],
	moderator: [permission_roles["trainee"], permission_roles["verified"]],
	trainee: [permission_roles["verified"]],
	verified: [],
};

module.exports = roleHierarchy;
