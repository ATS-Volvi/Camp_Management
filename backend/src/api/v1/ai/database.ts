import Database from '../../../../config/dbConn';

class AIDatabase {
    static async getSystemContext() {
        const pool = Database.getPool();
        const [camps, suppliers, rooms, inventory, tickets, financials] = await Promise.all([
            pool.query(`
                SELECT c.name, c.location, c.status,
                       COALESCE(SUM(r.max_capacity), 0)::int as total_capacity,
                       COALESCE(SUM(r.current_occupancy), 0)::int as current_occupancy,
                       COUNT(r.id)::int as total_rooms,
                       CASE 
                         WHEN COALESCE(SUM(r.max_capacity), 0) > 0 
                         THEN ROUND((COALESCE(SUM(r.current_occupancy), 0)::numeric / SUM(r.max_capacity)::numeric) * 100, 1) 
                         ELSE 0 
                       END as utilization_pct
                FROM camps c
                LEFT JOIN rooms r ON c.id = r.camp_id
                GROUP BY c.id, c.name, c.location, c.status
                ORDER BY c.name ASC
            `),
            pool.query(`
                SELECT COALESCE(e.supplier_name, 'Direct') as supplier,
                       c.name as camp_name,
                       count(*)::int as employee_count
                FROM employees e
                LEFT JOIN camps c ON e.camp_id = c.id
                GROUP BY e.supplier_name, c.name
                ORDER BY count(*) DESC
            `),
            pool.query(`
                SELECT status, count(*)::int as count 
                FROM rooms 
                GROUP BY status
            `),
            pool.query(`
                SELECT item_name, balance, min_alert_level 
                FROM inventory 
                WHERE balance <= min_alert_level
                LIMIT 50
            `),
            pool.query(`
                SELECT category, priority, status, count(*)::int as count,
                       COALESCE(SUM(cost), 0)::numeric as total_cost
                FROM maintenance_tickets 
                GROUP BY category, priority, status
            `),
            pool.query(`
                SELECT c.name as camp_name,
                       COALESCE(SUM(r.current_occupancy * COALESCE(r.daily_rate, 25) * 30), 0)::numeric as estimated_monthly_revenue,
                       COALESCE(SUM(r.current_occupancy * COALESCE(r.daily_food_rate, 15) * 30), 0)::numeric as estimated_monthly_catering_cost,
                       COALESCE(c.monthly_rent, 0)::numeric as monthly_rent
                FROM camps c
                LEFT JOIN rooms r ON c.id = r.camp_id
                GROUP BY c.id, c.name, c.monthly_rent
            `)
        ]);

        return {
            camps: camps.rows,
            suppliers: suppliers.rows,
            rooms: rooms.rows,
            inventory: inventory.rows,
            tickets: tickets.rows,
            financials: financials.rows
        };
    }

    static async getOccupancyAnomalies() {
        const pool = Database.getPool();
        const [issues, campStats] = await Promise.all([
            pool.query(`
                SELECT r.room_number, r.status, r.current_occupancy, r.max_capacity, c.name as camp_name,
                       CASE 
                         WHEN r.current_occupancy > r.max_capacity THEN 'Overcrowded (> capacity)'
                         WHEN r.current_occupancy < 0 THEN 'Negative Occupancy'
                         WHEN r.status = 'occupied' AND r.current_occupancy = 0 THEN 'Marked Occupied But Empty'
                         WHEN r.status = 'vacant' AND r.current_occupancy > 0 THEN 'Marked Vacant But Has Occupants'
                         ELSE 'Irregular'
                       END as anomaly_type
                FROM rooms r JOIN camps c ON r.camp_id = c.id
                WHERE r.current_occupancy > r.max_capacity 
                   OR r.current_occupancy < 0
                   OR (r.status = 'occupied' AND r.current_occupancy = 0)
                   OR (r.status = 'vacant' AND r.current_occupancy > 0)
                LIMIT 50
            `),
            pool.query(`
                SELECT c.name as camp_name, 
                       COALESCE(SUM(r.max_capacity), 0)::int as total_capacity,
                       COALESCE(SUM(r.current_occupancy), 0)::int as current_occupancy,
                       CASE WHEN COALESCE(SUM(r.max_capacity), 0) > 0 
                            THEN ROUND((COALESCE(SUM(r.current_occupancy), 0)::numeric / SUM(r.max_capacity)::numeric) * 100, 1) 
                            ELSE 0 END as utilization_pct
                FROM camps c
                LEFT JOIN rooms r ON c.id = r.camp_id
                GROUP BY c.id, c.name
            `)
        ]);
        return {
            detected_room_anomalies: issues.rows,
            camp_utilization_summary: campStats.rows
        };
    }

    static async getMaintenanceAnomalies() {
        const pool = Database.getPool();
        const { rows } = await pool.query(`
            SELECT t.category, t.priority, t.status, t.description, t.created_at, t.cost, 
                   c.name as camp_name, r.room_number
            FROM maintenance_tickets t
            LEFT JOIN camps c ON t.camp_id = c.id
            LEFT JOIN rooms r ON t.room_id = r.id
            WHERE t.status != 'completed'
            ORDER BY CASE WHEN t.priority = 'emergency' THEN 1 WHEN t.priority = 'high' THEN 2 ELSE 3 END, t.created_at DESC
            LIMIT 50
        `);
        return rows;
    }

    static async getInventoryAnomalies() {
        const pool = Database.getPool();
        const { rows } = await pool.query(`
            SELECT i.item_name, i.balance, i.min_alert_level, i.category, c.name as camp_name
            FROM inventory i
            LEFT JOIN camps c ON i.camp_id = c.id
            WHERE i.balance <= i.min_alert_level
            LIMIT 50
        `);
        return rows;
    }
}

export default AIDatabase;
