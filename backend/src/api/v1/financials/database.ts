import Database from '../../../../config/dbConn';

class FinancialsDatabase {
    static async getRoomIncome(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT r.id, r.room_number, r.category, r.max_capacity, r.current_occupancy, r.camp_id, 
                   json_build_object('name', c.name) as camps
            FROM rooms r
            LEFT JOIN camps c ON r.camp_id = c.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE r.camp_id = $1`;
        }
        const { rows } = await pool.query(query, values);
        return rows;
    }
}

export default FinancialsDatabase;
