import Database from '../../../../config/dbConn';

class AttendanceDatabase {
    static async getOccupants(campIds: string[]) {
        const pool = Database.getPool();
        const query = `
            WITH latest_check_in AS (
                SELECT DISTINCT ON (employee_id) employee_id, id, room_id, check_in_date, camp_id
                FROM check_ins
                WHERE camp_id = ANY($1)
                ORDER BY employee_id, check_in_date DESC
            ),
            latest_check_out AS (
                SELECT DISTINCT ON (employee_id) employee_id, id, check_out_date
                FROM check_outs
                WHERE camp_id = ANY($1)
                ORDER BY employee_id, check_out_date DESC
            )
            SELECT e.id, e.name, e.employee_id as emp_id_str, e.designation, e.company, e.employee_type, e.supplier_name, e.department, e.project,
                   ci.room_id, ci.check_in_date, ci.camp_id,
                   r.room_number, r.category as room_category,
                   crr.daily_rate
            FROM latest_check_in ci
            LEFT JOIN latest_check_out co ON ci.employee_id = co.employee_id
            JOIN employees e ON ci.employee_id = e.id
            JOIN rooms r ON ci.room_id = r.id
            LEFT JOIN camp_room_rates crr ON ci.camp_id = crr.camp_id AND r.category = crr.room_category
            WHERE co.check_out_date IS NULL OR ci.check_in_date > co.check_out_date
        `;
        const { rows } = await pool.query(query, [campIds]);
        return rows;
    }

    static async getAttendanceRange(campIds: string[], start: string, end: string) {
        const pool = Database.getPool();
        const checkInsQuery = `
            SELECT employee_id, check_in_date
            FROM check_ins
            WHERE camp_id = ANY($1)
              AND check_in_date >= $2
              AND check_in_date <= $3
        `;
        const checkOutsQuery = `
            SELECT employee_id, check_out_date
            FROM check_outs
            WHERE camp_id = ANY($1)
              AND check_out_date >= $2
              AND check_out_date <= $3
        `;

        const [checkIns, checkOuts] = await Promise.all([
            pool.query(checkInsQuery, [campIds, start, end]),
            pool.query(checkOutsQuery, [campIds, start, end])
        ]);

        return {
            check_ins: checkIns.rows,
            check_outs: checkOuts.rows
        };
    }

    static async getRoomOccupants(roomId: string, campId: string) {
        const pool = Database.getPool();
        const query = `
            WITH latest_check_in AS (
                SELECT DISTINCT ON (employee_id) employee_id, room_id, check_in_date, camp_id
                FROM check_ins
                WHERE room_id = $1 AND camp_id = $2
                ORDER BY employee_id, check_in_date DESC
            ),
            latest_check_out AS (
                SELECT DISTINCT ON (employee_id) employee_id, check_out_date
                FROM check_outs
                WHERE room_id = $1 AND camp_id = $2
                ORDER BY employee_id, check_out_date DESC
            )
            SELECT e.id, e.name, e.employee_id as emp_id_str, e.designation, e.company, e.employee_type, e.supplier_name, e.project,
                   ci.check_in_date, crr.daily_rate
            FROM latest_check_in ci
            LEFT JOIN latest_check_out co ON ci.employee_id = co.employee_id
            JOIN employees e ON ci.employee_id = e.id
            JOIN rooms r ON ci.room_id = r.id
            LEFT JOIN camp_room_rates crr ON ci.camp_id = crr.camp_id AND r.category = crr.room_category
            WHERE co.check_out_date IS NULL OR ci.check_in_date > co.check_out_date
        `;
        const { rows } = await pool.query(query, [roomId, campId]);
        return rows;
    }

    static async getRoomHistory(roomId: string, campId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT co.employee_id, co.check_out_date,
                   e.name, e.employee_id as emp_code, e.designation, e.supplier_name, e.company, e.project, e.employee_type,
                   (
                       SELECT ci.check_in_date 
                       FROM check_ins ci 
                       WHERE ci.employee_id = co.employee_id AND ci.room_id = co.room_id AND ci.check_in_date <= co.check_out_date
                       ORDER BY ci.check_in_date DESC LIMIT 1
                   ) as check_in_date
            FROM check_outs co
            JOIN employees e ON co.employee_id = e.id
            WHERE co.room_id = $1 AND co.camp_id = $2
            ORDER BY co.check_out_date DESC
        `;
        const { rows } = await pool.query(query, [roomId, campId]);
        return rows;
    }

    static async getCheckInReports(from: string, campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT ci.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id, 'employee_type', e.employee_type, 'supplier_name', e.supplier_name) as employees,
                   json_build_object('room_number', r.room_number) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_ins ci
            LEFT JOIN employees e ON ci.employee_id = e.id
            LEFT JOIN rooms r ON ci.room_id = r.id
            LEFT JOIN camps c ON ci.camp_id = c.id
            WHERE ci.check_in_date >= $1
        `;
        const params: any[] = [from];
        if (campId && campId !== 'all') {
            query += ' AND ci.camp_id = $2';
            params.push(campId);
        }
        query += ' ORDER BY ci.check_in_date DESC';
        const { rows } = await pool.query(query, params);
        return rows;
    }

    static async getCheckOutReports(from: string, campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT co.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id, 'employee_type', e.employee_type, 'supplier_name', e.supplier_name) as employees,
                   json_build_object('room_number', r.room_number) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_outs co
            LEFT JOIN employees e ON co.employee_id = e.id
            LEFT JOIN rooms r ON co.room_id = r.id
            LEFT JOIN camps c ON co.camp_id = c.id
            WHERE co.check_out_date >= $1
        `;
        const params: any[] = [from];
        if (campId && campId !== 'all') {
            query += ' AND co.camp_id = $2';
            params.push(campId);
        }
        query += ' ORDER BY co.check_out_date DESC';
        const { rows } = await pool.query(query, params);
        return rows;
    }
}

export default AttendanceDatabase;
