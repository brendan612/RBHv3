const { Role, GuildMember, PermissionsBitField } = require("discord.js");

const { User, ServerRole } = require("../../models");

const client = require("../../client");

const permission_roles = require(`../../../${process.env.CONFIG_FILE}`).roles.permission_roles;

class RoleManager {
    /**
     *
     * @param {string} name
     * @returns {Promise<Role>}
     */
    static async createRole(name) {
        if (!name) {
            throw new Error("Name is required");
        }

        const role = await client.guild.roles.create({
            name,
            reason: "Role created by server",
        });

        return role;
    }

    /**
     *
     * @param {number} game_id
     * @param {string} region_id
     * @param {string} purpose
     * @returns {ServerRole[]}
     */
    static findServerRoles(game_id, region_id, purpose) {
        return client.serverRoles.find((role) => role.game_id === game_id && role.region_id === region_id && role.purpose === purpose);
    }

    /**
     *
     * @param {string} role_id
     * @returns {ServerRole}
     */
    static findServerRole(role_id) {
        return client.serverRoles.find((role) => role.role_id === role_id);
    }

    /**
     *
     * @param {ServerRole} serverRole
     * @returns {Role}
     */
    static getRoleForServerRole(serverRole) {
        return client.guild.roles.cache.get(serverRole.role_id);
    }

    /**
     *
     * @param {string} role_id
     * @returns {Role}
     */
    static getRole(role_id) {
        return client.guild.roles.cache.get(role_id);
    }

    /**
     *
     * @param {number} game_id
     * @param {string} region_id
     * @param {string} purpose
     * @returns {Role}
     */
    static getRoleViaServerRole(game_id, region_id, purpose) {
        const serverRole = RoleManager.findServerRoles(game_id, region_id, purpose);
        if (!serverRole) {
            throw new Error("Role not found");
        }
        if (Array.isArray(serverRole)) {
            return RoleManager.getRoleForServerRole(serverRole[0]);
        }

        return RoleManager.getRoleForServerRole(serverRole);
    }

    /**
     *
     * @param {string} role_id
     * @param {string} name
     * @param {string} purpose
     * @param {number} game_id
     * @param {string} type
     * @param {string} region_id
     * @returns {Promise<ServerRole>}
     */
    static async createServerRole(role_id, name, purpose, game_id, type, region_id) {
        const serverRole = await ServerRole.create({
            name,
            type,
            purpose,
            role_id,
            game_id,
            region_id,
        });

        client.serverRoles = await ServerRole.findAll();

        return serverRole;
    }

    /**
     *
     * @param {string} role_id
     * @returns {Promise<void>}
     */
    static async deleteServerRole(role_id) {
        const serverRole = await ServerRole.findOne({
            where: { role_id },
        });

        if (!serverRole) {
            throw new Error("Role not found");
        }

        await serverRole.destroy();

        client.serverRoles = await ServerRole.findAll();
    }

    /**
     *
     * @param {string} role_id
     * @param  {...User} users
     */
    static async assignRoleToUsers(role_id, ...users) {
        const role = this.getRole(role_id);

        if (!role) {
            throw new Error("Role not found");
        }

        const promises = users.map(async (user) => {
            if (user.user_id.length < 5) return;

            const member = await client.guild.members.fetch(user.user_id);

            if (!member) {
                throw new Error("Member not found");
            }

            await member.roles.add(role);
        });

        await Promise.all(promises);
    }

    /**
     *
     * @param {string} role_id
     * @param  {...User} users
     */
    static async removeRoleFromUsers(role_id, ...users) {
        const role = this.getRole(role_id);

        if (!role) {
            throw new Error("Role not found");
        }

        const promises = users.map(async (user) => {
            const member = await client.guild.members.fetch(user.user_id);

            if (!member) {
                throw new Error("Member not found");
            }

            await member.roles.remove(role);
        });

        await Promise.all(promises);
    }
}

module.exports = RoleManager;
