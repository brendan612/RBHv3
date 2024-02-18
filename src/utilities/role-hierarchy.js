const permission_roles = require(`../../${process.env.CONFIG_FILE}`).roles
	.permission_roles;

const roleHierarchy = [
	permission_roles["owner"],
	permission_roles["knave"],
	permission_roles["developer"],
	permission_roles["admin"],
	permission_roles["moderator"],
	permission_roles["trainee"],
	permission_roles["verified"],
];

module.exports = roleHierarchy;
