import Database from '../../../../config/dbConn';

class CampTransfersDatabase {
    static async approveTransfer(id: string, approvedBy: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `UPDATE camp_transfer_requests 
             SET status = 'approved', approved_by = $1, approved_at = now() 
             WHERE id = $2 AND status = 'pending' 
             RETURNING *`,
            [approvedBy, id]
        );
        return rows[0];
    }

    static async rejectTransfer(id: string, rejectedBy: string, rejectionReason: string) {
        const pool = Database.getPool();
        const { rows } = await pool.query(
            `UPDATE camp_transfer_requests 
             SET status = 'rejected', approved_by = $1, approved_at = now(), rejection_reason = $2 
             WHERE id = $3 AND status = 'pending' 
             RETURNING *`,
            [rejectedBy, rejectionReason, id]
        );
        return rows[0];
    }

    static async reportTransferTransaction(id: string, newRoomId: string) {
        const pool = Database.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const reqRes = await client.query('SELECT * FROM camp_transfer_requests WHERE id = $1', [id]);
            if (reqRes.rows.length === 0) {
                throw new Error('Camp transfer request not found');
            }
            const request = reqRes.rows[0];

            if (request.status !== 'approved') {
                throw new Error('Request must be approved before reporting');
            }

            const roomRes = await client.query('SELECT * FROM rooms WHERE id = $1', [newRoomId]);
            if (roomRes.rows.length === 0) {
                throw new Error('Target room not found');
            }
            const targetRoom = roomRes.rows[0];
            
            if (targetRoom.camp_id !== request.to_camp_id) {
                 throw new Error('Target room must be in the destination camp');
            }

            if (targetRoom.current_occupancy >= targetRoom.max_capacity) {
                throw new Error('Target room is at full capacity');
            }

            const empRoomRes = await client.query("SELECT room_id FROM check_ins WHERE employee_id = $1 AND status = 'active'", [request.employee_id]);
            let oldRoomId = null;
            if(empRoomRes.rows.length > 0){
                 oldRoomId = empRoomRes.rows[0].room_id;
            }

            if (oldRoomId) {
                 await client.query(
                    'UPDATE rooms SET current_occupancy = GREATEST(current_occupancy - 1, 0) WHERE id = $1',
                    [oldRoomId]
                 );
            }

            await client.query(
                'UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE id = $1',
                [newRoomId]
            );

            await client.query(
                 `UPDATE check_ins 
                  SET room_id = $1, camp_id = $2 
                  WHERE employee_id = $3 AND status = 'active'`,
                 [newRoomId, request.to_camp_id, request.employee_id]
            );

            await client.query(
                `UPDATE camp_transfer_requests 
                 SET status = 'completed', physically_reported = true, reported_at = now(), new_room_id = $1 
                 WHERE id = $2`,
                [newRoomId, id]
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

export default CampTransfersDatabase;
