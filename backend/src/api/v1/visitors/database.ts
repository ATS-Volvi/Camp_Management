import Database from '../../../../config/dbConn';

class VisitorsDatabase {
    static async getAllVisitors(filters: any) {
        const pool = Database.getPool();
        const { camp_id, status } = filters;
        let query = `
            SELECT v.*, 
            json_build_object('name', c.name) as camps,
            json_build_object('name', e.name, 'employee_id', e.employee_id) as employees
            FROM visitors v
            LEFT JOIN camps c ON v.camp_id = c.id
            LEFT JOIN employees e ON v.host_employee_id = e.id
            WHERE 1=1
        `;
        const values: any[] = [];

        if (camp_id && camp_id !== 'all') {
            values.push(camp_id);
            query += ` AND v.camp_id = $${values.length}`;
        }
        if (status && status !== 'all') {
            values.push(status);
            query += ` AND v.status = $${values.length}`;
        }

        query += ` ORDER BY v.check_in_time DESC LIMIT 500`;

        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getVisitorStats(campId: string | undefined) {
        const pool = Database.getPool();
        let query = 'SELECT status, camp_id FROM visitors';
        const values: any[] = [];

        if (campId && campId !== 'all') {
            values.push(campId);
            query += ` WHERE camp_id = $${values.length}`;
        }

        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async createVisitor(data: any) {
        const pool = Database.getPool();
        const { name, phone_number, identity_proof_type, identity_proof_number, purpose, expected_duration_hours, camp_id } = data;
        const { rows } = await pool.query(
            `INSERT INTO visitors 
            (name, phone_number, identity_proof_type, identity_proof_number, purpose, expected_duration_hours, status, check_in_time, camp_id) 
            VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), $7) RETURNING *`,
            [name, phone_number, identity_proof_type, identity_proof_number, purpose, expected_duration_hours, camp_id]
        );
        return rows[0];
    }

    static async checkOutVisitor(id: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `UPDATE visitors SET status = 'completed', check_out_time = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );
        return rows[0];
    }
}

export default VisitorsDatabase;
