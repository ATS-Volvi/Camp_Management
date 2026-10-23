import Database from '../../../../config/dbConn';

class DashboardDatabase {
    static async getRecentTickets() {
        const pool = Database.getPool();
        const { rows } = await pool.query(`
            SELECT t.id, t.description, t.category, t.status, t.created_at, 
                   json_build_object('name', c.name) as camps
            FROM maintenance_tickets t
            LEFT JOIN camps c ON t.camp_id = c.id
            ORDER BY t.created_at DESC
            LIMIT 5
        `);
        return rows;
    }

    static async getCheckIns() {
        const pool = Database.getPool();
        const { rows } = await pool.query(`
            SELECT ci.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id, 'employee_type', e.employee_type, 'supplier_name', e.supplier_name, 'designation', e.designation, 'company', e.company, 'project', e.project) as employees,
                   json_build_object('room_number', r.room_number, 'category', r.category) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_ins ci
            LEFT JOIN employees e ON ci.employee_id = e.id
            LEFT JOIN rooms r ON ci.room_id = r.id
            LEFT JOIN camps c ON ci.camp_id = c.id
            ORDER BY ci.check_in_date DESC
            LIMIT 1000
        `);
        return rows;
    }

    static async getCheckOuts() {
        const pool = Database.getPool();
        const { rows } = await pool.query(`
            SELECT co.*, 
                   json_build_object('name', e.name, 'employee_id', e.employee_id, 'employee_type', e.employee_type, 'supplier_name', e.supplier_name, 'designation', e.designation, 'company', e.company, 'project', e.project) as employees,
                   json_build_object('room_number', r.room_number, 'category', r.category) as rooms,
                   json_build_object('name', c.name) as camps
            FROM check_outs co
            LEFT JOIN employees e ON co.employee_id = e.id
            LEFT JOIN rooms r ON co.room_id = r.id
            LEFT JOIN camps c ON co.camp_id = c.id
            ORDER BY co.check_out_date DESC
            LIMIT 1000
        `);
        return rows;
    }

    static async getSystemAlerts() {
        const pool = Database.getPool();
        const [lowInventory, urgentTickets, fullRooms, expiringContracts, blacklisted] = await Promise.all([
            pool.query(`
                SELECT i.*, json_build_object('name', c.name) as camps
                FROM inventory i
                LEFT JOIN camps c ON i.camp_id = c.id
                WHERE i.balance <= i.min_alert_level
                LIMIT 200
            `),
            pool.query(`
                SELECT t.*, json_build_object('room_number', r.room_number) as rooms, json_build_object('name', c.name) as camps
                FROM maintenance_tickets t
                LEFT JOIN rooms r ON t.room_id = r.id
                LEFT JOIN camps c ON t.camp_id = c.id
                WHERE t.status IN ('open', 'in_progress') AND t.priority IN ('high', 'emergency')
                ORDER BY t.created_at DESC
                LIMIT 50
            `),
            pool.query(`
                SELECT r.*, json_build_object('name', b.name) as buildings, json_build_object('name', c.name) as camps
                FROM rooms r
                LEFT JOIN buildings b ON r.building_id = b.id
                LEFT JOIN camps c ON r.camp_id = c.id
                WHERE r.status = 'occupied' AND r.current_occupancy >= r.max_capacity
                ORDER BY r.current_occupancy DESC
                LIMIT 50
            `),
            pool.query(`
                SELECT * FROM employees
                WHERE contract_end_date IS NOT NULL AND status = 'active'
                  AND contract_end_date >= NOW() AND contract_end_date <= NOW() + INTERVAL '30 days'
                ORDER BY contract_end_date ASC
                LIMIT 200
            `),
            pool.query(`
                SELECT * FROM employees
                WHERE is_blacklisted = true AND status = 'active'
                LIMIT 50
            `)
        ]);

        return {
            low_inventory: lowInventory.rows,
            urgent_tickets: urgentTickets.rows,
            full_rooms: fullRooms.rows,
            expiring_contracts: expiringContracts.rows,
            blacklisted_active: blacklisted.rows
        };
    }

    static async getDrilldown(query: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(query);
        return rows;
    }
}

export default DashboardDatabase;
