import Database from '../../../../config/dbConn';

class RoomChangesDatabase {
    static async approveRoomChangeTransaction(id: string, data: any) {
        const { approvedBy, newRoomId } = data;
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const reqRes = await client.query('SELECT * FROM room_change_requests WHERE id = $1', [id]);
            if (reqRes.rows.length === 0) {
                throw new Error('Room change request not found');
            }
            const request = reqRes.rows[0];

            if (request.status !== 'pending') {
                throw new Error('Request is not in pending status');
            }

            const targetRoomId = newRoomId || request.requested_room_id;
            if (!targetRoomId) {
                throw new Error('No target room specified');
            }

            const roomRes = await client.query('SELECT * FROM rooms WHERE id = $1', [targetRoomId]);
            if (roomRes.rows.length === 0) {
                throw new Error('Target room not found');
            }
            const targetRoom = roomRes.rows[0];
            if (targetRoom.current_occupancy >= targetRoom.max_capacity) {
                throw new Error('Target room is at full capacity');
            }

            await client.query(
                'UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0) WHERE id = $1',
                [request.current_room_id]
            );

            await client.query(
                'UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = $1',
                [targetRoomId]
            );

            await client.query(
                `UPDATE room_change_requests 
                 SET status = 'completed', approved_by = $1, approved_at = now(), 
                     new_room_id = $2, completed_at = now() 
                 WHERE id = $3`,
                [approvedBy, targetRoomId, id]
            );

            await client.query(
                `INSERT INTO notifications (employee_name, title, message, type, reference_id, reference_type) 
                 VALUES ((SELECT name FROM employees WHERE id = $1), 'Room Change Approved', 
                         'Your room change request has been approved. Please move to the new room.', 
                         'room_change', $2, 'room_change_request')`,
                [request.employee_id, id]
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

    static async rejectRoomChange(id: string, data: any) {
        const { rejectedBy, rejectionReason } = data;
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `UPDATE room_change_requests 
             SET status = 'rejected', approved_by = $1, approved_at = now(), rejection_reason = $2 
             WHERE id = $3 AND status = 'pending' 
             RETURNING *`,
            [rejectedBy, rejectionReason, id]
        );
        return rows[0];
    }
}

export default RoomChangesDatabase;
