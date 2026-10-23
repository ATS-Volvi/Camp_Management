import Database from '../../../../config/dbConn';

class MaintenanceDatabase {
    static async assignTicketTransaction(id: string, data: any) {
        const { staffName, notes, assignedBy } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const ticketRes = await client.query('SELECT * FROM maintenance_tickets WHERE id = $1', [id]);
            if (ticketRes.rows.length === 0) {
                throw new Error('Ticket not found');
            }
            const ticket = ticketRes.rows[0];
            const previousAssignee = ticket.assigned_to;

            await client.query(
                'UPDATE maintenance_tickets SET assigned_to = $1, status = $2 WHERE id = $3',
                [staffName, 'in_progress', id]
            );

            await client.query(
                'INSERT INTO maintenance_assignment_history (ticket_id, assigned_to, assigned_from, assigned_by, action, notes) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, staffName, previousAssignee, assignedBy, previousAssignee ? 'reassigned' : 'assigned', notes || null]
            );

            await client.query(
                'INSERT INTO notifications (employee_name, title, message, type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
                [staffName, 'Ticket Assigned', `Maintenance ticket for "${ticket.category}" has been assigned to you.`, 'assignment', id, 'maintenance_ticket']
            );

            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

export default MaintenanceDatabase;
