import Database from '../../../../config/dbConn';

class SuppliersDatabase {
    static async getAllSuppliers() {
        const pool = Database.getPool();
        const query = `
            SELECT c.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'room_category_code', crr.room_category_code,
                               'daily_rate', crr.daily_rate
                           )
                       ) FILTER (WHERE crr.room_category_code IS NOT NULL), 
                       '[]'
                   ) AS client_room_rates
            FROM clients c
            LEFT JOIN client_room_rates crr ON crr.client_id = c.id
            GROUP BY c.id
            ORDER BY c.code ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async getSupplierById(id: string) {
        const pool = Database.getPool();
        const query = `
            SELECT c.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'room_category_code', crr.room_category_code,
                               'daily_rate', crr.daily_rate
                           )
                       ) FILTER (WHERE crr.room_category_code IS NOT NULL), 
                       '[]'
                   ) AS client_room_rates
            FROM clients c
            LEFT JOIN client_room_rates crr ON crr.client_id = c.id
            WHERE c.id = $1
            GROUP BY c.id
        `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    }

    static async createSupplier(supplier: any, roomRates: any[] = []) {
        const pool = Database.getPool();
        const {
            code, name, contact_person, email, phone, address,
            vat_number, breakfast_rate = 0, lunch_rate = 0,
            dinner_rate = 0, ramadan_rate = 0, is_active = true
        } = supplier;

        const { rows } = await pool.query(
            `INSERT INTO clients 
            (code, name, contact_person, email, phone, address, vat_number, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [code, name, contact_person, email, phone, address, vat_number, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, is_active]
        );
        const created = rows[0];

        if (roomRates && roomRates.length > 0) {
            for (const rate of roomRates) {
                await pool.query(
                    `INSERT INTO client_room_rates (client_id, room_category_code, daily_rate)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (client_id, room_category_code) DO UPDATE SET daily_rate = EXCLUDED.daily_rate`,
                    [created.id, rate.room_category_code, rate.daily_rate]
                );
            }
        }

        return this.getSupplierById(created.id);
    }

    static async updateSupplier(id: string, supplier: any, roomRates?: any[]) {
        const pool = Database.getPool();
        const {
            code, name, contact_person, email, phone, address,
            vat_number, breakfast_rate, lunch_rate, dinner_rate,
            ramadan_rate, is_active
        } = supplier;

        await pool.query(
            `UPDATE clients SET
                code = COALESCE($1, code),
                name = COALESCE($2, name),
                contact_person = $3,
                email = $4,
                phone = $5,
                address = $6,
                vat_number = $7,
                breakfast_rate = COALESCE($8, breakfast_rate),
                lunch_rate = COALESCE($9, lunch_rate),
                dinner_rate = COALESCE($10, dinner_rate),
                ramadan_rate = COALESCE($11, ramadan_rate),
                is_active = COALESCE($12, is_active),
                updated_at = NOW()
            WHERE id = $13`,
            [code, name, contact_person, email, phone, address, vat_number, breakfast_rate, lunch_rate, dinner_rate, ramadan_rate, is_active, id]
        );

        if (roomRates && roomRates.length > 0) {
            for (const rate of roomRates) {
                await pool.query(
                    `INSERT INTO client_room_rates (client_id, room_category_code, daily_rate)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (client_id, room_category_code) DO UPDATE SET daily_rate = EXCLUDED.daily_rate`,
                    [id, rate.room_category_code, rate.daily_rate]
                );
            }
        }

        return this.getSupplierById(id);
    }

    static async deleteSupplier(id: string) {
        const pool = Database.getPool();
        await pool.query(`DELETE FROM client_room_rates WHERE client_id = $1`, [id]);
        await pool.query(`DELETE FROM clients WHERE id = $1`, [id]);
        return true;
    }
}

export default SuppliersDatabase;
