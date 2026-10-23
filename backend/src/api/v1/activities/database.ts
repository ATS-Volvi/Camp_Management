import Database from '../../../../config/dbConn';

class ActivitiesDatabase {
    static async getAllFeeds() {
        const pool = Database.getPool();
        const [checkIns, checkOuts, tickets, reports] = await Promise.all([
            pool.query(`
                SELECT ci.*, 
                       json_build_object('name', e.name, 'employee_id', e.employee_id) as employees,
                       json_build_object('room_number', r.room_number) as rooms,
                       json_build_object('name', c.name) as camps
                FROM check_ins ci
                LEFT JOIN employees e ON ci.employee_id = e.id
                LEFT JOIN rooms r ON ci.room_id = r.id
                LEFT JOIN camps c ON ci.camp_id = c.id
                ORDER BY ci.check_in_date DESC
                LIMIT 100
            `),
            pool.query(`
                SELECT co.*, 
                       json_build_object('name', e.name, 'employee_id', e.employee_id) as employees,
                       json_build_object('room_number', r.room_number) as rooms,
                       json_build_object('name', c.name) as camps
                FROM check_outs co
                LEFT JOIN employees e ON co.employee_id = e.id
                LEFT JOIN rooms r ON co.room_id = r.id
                LEFT JOIN camps c ON co.camp_id = c.id
                ORDER BY co.check_out_date DESC
                LIMIT 100
            `),
            pool.query(`
                SELECT t.*, 
                       json_build_object('room_number', r.room_number) as rooms,
                       json_build_object('name', c.name) as camps
                FROM maintenance_tickets t
                LEFT JOIN rooms r ON t.room_id = r.id
                LEFT JOIN camps c ON t.camp_id = c.id
                ORDER BY t.created_at DESC
                LIMIT 100
            `),
            pool.query(`
                SELECT * FROM checkout_reports
                ORDER BY created_at DESC
                LIMIT 200
            `)
        ]);

        return {
            check_ins: checkIns.rows,
            check_outs: checkOuts.rows,
            maintenance_tickets: tickets.rows,
            checkout_reports: reports.rows
        };
    }
}

export default ActivitiesDatabase;
