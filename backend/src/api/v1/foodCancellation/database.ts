import Database from '../../../../config/dbConn';

class FoodCancellationDatabase {
    static async getRequests(filters: { campId?: string; status?: string } = {}) {
        const pool = Database.getPool();
        let query = `
            SELECT r.*, 
                   json_agg(m.meal_type) FILTER (WHERE m.meal_type IS NOT NULL) AS meals,
                   json_build_object(
                       'id', e.id,
                       'name', e.name,
                       'employee_id', e.employee_id,
                       'designation', e.designation
                   ) AS employee
            FROM food_cancellation_requests r
            LEFT JOIN food_cancellation_request_meals m ON m.request_id = r.id
            LEFT JOIN employees e ON e.id = r.employee_id
        `;
        const values: any[] = [];
        const where: string[] = [];

        if (filters.campId) {
            values.push(filters.campId);
            where.push(`r.camp_id = $${values.length}`);
        }
        if (filters.status) {
            values.push(filters.status);
            where.push(`r.status = $${values.length}`);
        }

        if (where.length > 0) {
            query += ' WHERE ' + where.join(' AND ');
        }

        query += ' GROUP BY r.id, e.id, e.name, e.employee_id, e.designation ORDER BY r.submitted_at DESC';
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async submitCancellation(params: {
        employee_id: string;
        from_date: string;
        to_date: string;
        meals: string[];
        reason: string;
        remarks?: string | null;
        source?: string;
        submitted_by?: string | null;
        force?: boolean;
    }) {
        const pool = Database.getPool();
        const {
            employee_id,
            from_date,
            to_date,
            meals,
            reason,
            remarks = null,
            source = 'manual',
            submitted_by = null,
            force = false
        } = params;

        const { rows } = await pool.query(
            `SELECT public.submit_food_cancellation($1, $2, $3, $4::food_meal_type[], $5::food_cancel_reason, $6, $7::food_cancel_source, $8, $9) AS id`,
            [employee_id, from_date, to_date, meals, reason, remarks, source, submitted_by, force]
        );
        return rows[0]?.id;
    }

    static async approveCancellation(requestId: string, approverId: string | null) {
        const pool = Database.getPool();
        await pool.query(
            `SELECT public.approve_food_cancellation($1, $2)`,
            [requestId, approverId]
        );
        return true;
    }

    static async rejectCancellation(requestId: string, approverId: string | null, reason: string) {
        const pool = Database.getPool();
        await pool.query(
            `SELECT public.reject_food_cancellation($1, $2, $3)`,
            [requestId, approverId, reason]
        );
        return true;
    }

    static async getKitchenMealCount(campId: string, date: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `SELECT * FROM public.get_kitchen_meal_count($1, $2)`,
            [campId, date]
        );
        return rows;
    }

    static async getSettings(campId: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `SELECT * FROM camp_food_cancellation_settings WHERE camp_id = $1`,
            [campId]
        );
        return rows[0] || null;
    }

    static async upsertSettings(settings: {
        camp_id: string;
        approval_levels: number;
        cutoff_time: string;
        cutoff_strict: boolean;
        ramadan_mode: boolean;
        ramadan_start: string | null;
        ramadan_end: string | null;
        night_shift_auto_breakfast: boolean;
    }) {
        const pool = Database.getPool();
        const {
            camp_id,
            approval_levels,
            cutoff_time,
            cutoff_strict,
            ramadan_mode,
            ramadan_start,
            ramadan_end,
            night_shift_auto_breakfast
        } = settings;

        const { rows } = await pool.query(
            `INSERT INTO camp_food_cancellation_settings 
            (camp_id, approval_levels, cutoff_time, cutoff_strict, ramadan_mode, ramadan_start, ramadan_end, night_shift_auto_breakfast)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (camp_id) DO UPDATE SET
                approval_levels = EXCLUDED.approval_levels,
                cutoff_time = EXCLUDED.cutoff_time,
                cutoff_strict = EXCLUDED.cutoff_strict,
                ramadan_mode = EXCLUDED.ramadan_mode,
                ramadan_start = EXCLUDED.ramadan_start,
                ramadan_end = EXCLUDED.ramadan_end,
                night_shift_auto_breakfast = EXCLUDED.night_shift_auto_breakfast,
                updated_at = NOW()
            RETURNING *`,
            [camp_id, approval_levels, cutoff_time, cutoff_strict, ramadan_mode, ramadan_start, ramadan_end, night_shift_auto_breakfast]
        );
        return rows[0];
    }
}

export default FoodCancellationDatabase;
