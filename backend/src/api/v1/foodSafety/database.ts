import Database from '../../../../config/dbConn';

class FoodSafetyDatabase {
    static async getMessFacilities(campId: string | undefined) {
        const pool = Database.getPool();
        let query = 'SELECT * FROM mess_facilities';
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ' WHERE camp_id = $1';
        }
        query += ' ORDER BY name';
        const { rows } = await pool.query(query, values);
        return rows;
    }

    static async getAuditTemplates() {
        const pool = Database.getPool();
        const query = `
            SELECT t.*, 
                   COALESCE(
                       json_agg(ti.* ORDER BY ti.sort_order) FILTER (WHERE ti.id IS NOT NULL), '[]'
                   ) as audit_template_items
            FROM audit_templates t
            LEFT JOIN audit_template_items ti ON t.id = ti.template_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    static async createAuditTemplateTransaction(data: any) {
        const { name, audit_type, description, items } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: tRows } = await client.query(
                'INSERT INTO audit_templates (name, audit_type, description) VALUES ($1, $2, $3) RETURNING *',
                [name, audit_type, description]
            );
            const template = tRows[0];

            if (items && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const itemKeys = ['template_id', 'sort_order', ...Object.keys(item)];
                    const itemVals = [template.id, i, ...Object.values(item)];
                    const placeholders = itemKeys.map((_, idx) => `$${idx + 1}`).join(',');
                    await client.query(`INSERT INTO audit_template_items (${itemKeys.join(',')}) VALUES (${placeholders})`, itemVals);
                }
            }

            await client.query('COMMIT');
            return template;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async createAuditTransaction(data: any) {
        const { template_id, camp_id, mess_facility_id, audit_type, contractor_name, project_name, auditor_id } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: aRows } = await client.query(
                `INSERT INTO food_safety_audits 
                (template_id, camp_id, mess_facility_id, audit_type, contractor_name, project_name, auditor_id, status, audit_date) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', NOW()) RETURNING *`,
                [template_id, camp_id, mess_facility_id, audit_type, contractor_name, project_name, auditor_id]
            );
            const audit = aRows[0];

            if (template_id) {
                const { rows: items } = await client.query(
                    'SELECT * FROM audit_template_items WHERE template_id = $1 ORDER BY sort_order',
                    [template_id]
                );

                for (const item of items) {
                    await client.query(
                        `INSERT INTO audit_responses 
                        (audit_id, template_item_id, category, question, response_type, max_score) 
                        VALUES ($1, $2, $3, $4, $5, $6)`,
                        [audit.id, item.id, item.category, item.question, item.response_type, item.response_type === 'rating' ? 5 : 1]
                    );
                }
            }

            await client.query('COMMIT');
            return audit;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async completeAuditTransaction(auditId: string) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { rows: responses } = await client.query('SELECT * FROM audit_responses WHERE audit_id = $1', [auditId]);

            const totalScore = responses.reduce((sum, r) => sum + (r.score || 0), 0);
            const maxScore = responses.reduce((sum, r) => sum + (r.max_score || 0), 0) || 1;
            const pct = Math.round((totalScore / maxScore) * 100);
            const grade = pct >= 90 ? 'compliant' : pct >= 70 ? 'moderate_risk' : 'critical';

            await client.query(
                `UPDATE food_safety_audits 
                 SET status = 'completed', total_score = $1, max_score = $2, compliance_pct = $3, risk_grade = $4, completed_at = NOW() 
                 WHERE id = $5`,
                [totalScore, maxScore, pct, grade, auditId]
            );

            const failedItems = responses.filter(r => !r.is_compliant);
            if (failedItems.length > 0) {
                const { rows: auditRows } = await client.query('SELECT camp_id FROM food_safety_audits WHERE id = $1', [auditId]);
                const campId = auditRows[0]?.camp_id;

                for (let i = 0; i < failedItems.length; i++) {
                    const item = failedItems[i];
                    const ncrNumber = `NCR-${Date.now()}-${i + 1}`;
                    await client.query(
                        `INSERT INTO ncr_records (audit_id, audit_response_id, camp_id, ncr_number, category, description, severity) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [auditId, item.id, campId, ncrNumber, item.category, `Non-compliance: ${item.question}${item.remarks ? ` - ${item.remarks}` : ''}`,
                            item.response_type === 'rating' && (item.rating || 0) <= 2 ? 'critical' : 'major']
                    );
                }
            }

            await client.query('COMMIT');
            return { pct, grade, ncrCount: failedItems.length };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getAudits(campId: string | undefined) {
        const pool = Database.getPool();
        let query = `
            SELECT a.*, json_build_object('name', c.name) as camps, json_build_object('name', f.name) as mess_facilities
            FROM food_safety_audits a
            LEFT JOIN camps c ON a.camp_id = c.id
            LEFT JOIN mess_facilities f ON a.mess_facility_id = f.id
        `;
        const values: any[] = [];
        if (campId) {
            values.push(campId);
            query += ` WHERE a.camp_id = $1`;
        }
        query += ` ORDER BY a.audit_date DESC`;
        const { rows } = await pool.query(query, values);
        return rows;
    }
}

export default FoodSafetyDatabase;
