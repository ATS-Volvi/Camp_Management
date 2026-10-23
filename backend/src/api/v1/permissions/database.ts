import Database from '../../../../config/dbConn';

class PermissionsDatabase {
    static async getUserRoles(userId: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [userId]
        );
        return rows.map(r => r.role);
    }

    static async getRolePermissions(roles: string[]) {
        const pool = Database.getPool();
        const placeholders = roles.map((_, i) => `$${i + 1}`).join(',');
        const query = `
            SELECT rp.granted, 
                   json_build_object('module', p.module, 'feature', p.feature, 'action', p.action) as permissions
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.granted = true AND rp.role IN (${placeholders})
        `;

        const { rows } = await pool.query(query, roles);
        return rows;
    }
}

export default PermissionsDatabase;
