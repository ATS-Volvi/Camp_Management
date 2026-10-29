import Database from '../../../../config/dbConn';

class CampsDatabase {
    static async getAllCamps() {
        const pool = Database.getPool();
        const query = `
            SELECT c.*, 
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'status', r.status, 
                        'current_occupancy', r.current_occupancy, 
                        'max_capacity', r.max_capacity
                    )
                ) FILTER (WHERE r.id IS NOT NULL), '[]'
            ) as rooms
            FROM camps c
            LEFT JOIN rooms r ON c.id = r.camp_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async getCampById(id: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query('SELECT * FROM camps WHERE id = $1', [id]);
        return rows[0];
    }

    static async getBuildings(campId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT b.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', r.id, 
                        'status', r.status, 
                        'current_occupancy', r.current_occupancy, 
                        'max_capacity', r.max_capacity
                    )
                ) FILTER (WHERE r.id IS NOT NULL), '[]'
            ) as rooms
            FROM buildings b
            LEFT JOIN rooms r ON b.id = r.building_id
            WHERE b.camp_id = $1
            GROUP BY b.id
            ORDER BY b.name ASC
        `;
        const { rows } = await pool.query(query, [campId]);
        return rows;
    }

    static async getRooms(campId: string) {
        const pool = Database.getPool();
        const query = `
            SELECT r.*, json_build_object('name', b.name) as buildings
            FROM rooms r
            LEFT JOIN buildings b ON r.building_id = b.id
            WHERE r.camp_id = $1
            ORDER BY r.room_number ASC
        `;
        const { rows } = await pool.query(query, [campId]);
        return rows;
    }

    static async createCamp(name: string, location: string, totalCapacity: number) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'INSERT INTO camps (name, location, total_capacity) VALUES ($1, $2, $3) RETURNING *',
            [name, location, totalCapacity]
        );
        return rows[0];
    }

    static async createBuilding(name: string, campId: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'INSERT INTO buildings (name, camp_id) VALUES ($1, $2) RETURNING *',
            [name, campId]
        );
        return rows[0];
    }

    static async createRoom(roomNumber: string, capacity: number, buildingId: string, campId: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            'INSERT INTO rooms (room_number, capacity, building_id, camp_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [roomNumber, capacity, buildingId, campId]
        );
        return rows[0];
    }

    static async getInmates(campId: string) {
        const pool = Database.getPool();
        const query = `
            WITH latest_ci AS (
                SELECT DISTINCT ON (employee_id) *
                FROM check_ins
                WHERE camp_id = $1
                ORDER BY employee_id, check_in_date DESC
            ),
            latest_co AS (
                SELECT DISTINCT ON (employee_id) *
                FROM check_outs
                WHERE camp_id = $1
                ORDER BY employee_id, check_out_date DESC
            )
            SELECT e.*, 
                   lci.check_in_date, 
                   lci.room_id,
                   r.room_number, 
                   r.category as room_category,
                   COALESCE(r.daily_rate, 0) as daily_rate,
                   COALESCE(r.daily_food_rate, 0) as daily_food_rate
            FROM latest_ci lci
            LEFT JOIN latest_co lco ON lci.employee_id = lco.employee_id
            JOIN employees e ON lci.employee_id = e.id
            JOIN rooms r ON lci.room_id = r.id
            WHERE (lco.check_out_date IS NULL OR lci.check_in_date > lco.check_out_date)
            ORDER BY lci.check_in_date DESC
        `;
        const { rows } = await pool.query(query, [campId]);
        return rows;
    }

    static async deleteCamp(id: string, forceArchive: boolean = false) {
        const pool = Database.getPool();

        // 1. Verify existence
        const { rows: campRows } = await pool.query('SELECT * FROM camps WHERE id = $1', [id]);
        if (!campRows[0]) {
            return { notFound: true };
        }

        // 2. Count active occupants
        const occQuery = `
            WITH latest_ci AS (
                SELECT DISTINCT ON (employee_id) *
                FROM check_ins
                WHERE camp_id = $1
                ORDER BY employee_id, check_in_date DESC
            ),
            latest_co AS (
                SELECT DISTINCT ON (employee_id) *
                FROM check_outs
                WHERE camp_id = $1
                ORDER BY employee_id, check_out_date DESC
            )
            SELECT COUNT(*)::int as count
            FROM latest_ci lci
            LEFT JOIN latest_co lco ON lci.employee_id = lco.employee_id
            WHERE (lco.check_out_date IS NULL OR lci.check_in_date > lco.check_out_date)
        `;
        const { rows: occRows } = await pool.query(occQuery, [id]);
        const activeOccupants = occRows[0]?.count || 0;

        if (activeOccupants > 0 && !forceArchive) {
            return {
                blocked: true,
                activeOccupants,
                message: `Cannot delete camp: It currently has ${activeOccupants} active resident(s). Please check them out or decommission/archive the camp instead.`
            };
        }

        // 3. If forceArchive is selected (or active occupants need decommissioning):
        if (forceArchive) {
            const { rows: updated } = await pool.query(
                "UPDATE camps SET status = 'inactive', updated_at = now() WHERE id = $1 RETURNING *",
                [id]
            );
            return { archived: true, camp: updated[0] };
        }

        // 4. Attempt hard delete
        try {
            const { rows: deleted } = await pool.query('DELETE FROM camps WHERE id = $1 RETURNING *', [id]);
            return { deleted: true, camp: deleted[0] };
        } catch (err: any) {
            if (err.code === '23503') {
                return {
                    hasHistory: true,
                    message: 'Cannot permanently delete this camp because historical records (such as employee assignments, audits, or invoices) reference it. You can safely decommission / archive it instead.'
                };
            }
            throw err;
        }
    }
}

export default CampsDatabase;
