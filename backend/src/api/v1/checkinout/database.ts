import Database from '../../../../config/dbConn';

class CheckInOutDatabase {
    static async getRecentCheckIns() {
        const pool = Database.getPool();
        const query = `
            SELECT ci.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id) as employees,
                   json_build_object('room_number', r.room_number) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_ins ci
            LEFT JOIN employees e ON ci.employee_id = e.id
            LEFT JOIN rooms r ON ci.room_id = r.id
            LEFT JOIN camps c ON ci.camp_id = c.id
            ORDER BY ci.created_at DESC
            LIMIT 20
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async getRecentCheckOuts() {
        const pool = Database.getPool();
        const query = `
            SELECT co.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id) as employees,
                   json_build_object('room_number', r.room_number) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_outs co
            LEFT JOIN employees e ON co.employee_id = e.id
            LEFT JOIN rooms r ON co.room_id = r.id
            LEFT JOIN camps c ON co.camp_id = c.id
            ORDER BY co.created_at DESC
            LIMIT 20
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async performCheckIn(data: any) {
        const pool = Database.getPool();
        const {
            p_employee_id,
            p_room_id,
            p_camp_id,
            p_performed_by,
            p_iqama_number = null,
            p_passport_number = null,
            p_food_required = true
        } = data;
        const { rows } = await pool.query(
            'SELECT public.perform_check_in($1, $2, $3, $4, $5, $6, $7) as result',
            [p_employee_id, p_room_id, p_camp_id, p_performed_by, p_iqama_number, p_passport_number, p_food_required]
        );
        return rows[0]?.result;
    }

    static async performCheckOut(data: any) {
        const pool = Database.getPool();
        const {
            p_employee_id, p_room_id, p_camp_id, p_performed_by, p_assets_returned,
            p_damage_remarks, p_clearance_notes, p_is_blacklisted, p_blacklist_reason,
            p_feedback, p_feedback_rating
        } = data;
        const { rows } = await pool.query(
            'SELECT perform_check_out($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) as result',
            [p_employee_id, p_room_id, p_camp_id, p_performed_by, p_assets_returned, p_damage_remarks, p_clearance_notes, p_is_blacklisted, p_blacklist_reason, p_feedback, p_feedback_rating]
        );
        return rows[0].result;
    }
}

export default CheckInOutDatabase;
