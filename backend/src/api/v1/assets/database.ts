import Database from '../../../../config/dbConn';

class AssetsDatabase {
    static async getAllAssets(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT a.*,
                   json_build_object('name', c.name) as camps,
                   json_build_object(
                       'room_number', r.room_number,
                       'building_id', r.building_id,
                       'buildings', json_build_object('name', b.name)
                   ) as rooms
            FROM assets a
            LEFT JOIN camps c ON a.camp_id = c.id
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN buildings b ON r.building_id = b.id
            WHERE 1=1
        `;
        const values: any[] = [];

        if (campId) {
            values.push(campId);
            query += ` AND a.camp_id = $${values.length}`;
        }

        query += ` ORDER BY a.created_at DESC`;

        const { rows } = await pool.query(query, values);
        return rows;
    }
}

export default AssetsDatabase;
