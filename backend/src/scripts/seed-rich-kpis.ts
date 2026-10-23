import { pool } from '../lib/db.js';

async function seedRichKpis() {
    const client = await pool.connect();
    try {
        console.log('Starting comprehensive seed of rich KPI data...');
        await client.query('BEGIN');

        // 1. Ensure camps have realistic rates and properties
        const campsRes = await client.query('SELECT id, name FROM public.camps');
        const camps = campsRes.rows;
        console.log(`Found ${camps.length} camps`);

        for (const camp of camps) {
            await client.query(`
                UPDATE public.camps 
                SET monthly_rent = COALESCE(monthly_rent, 18500),
                    is_rented = COALESCE(is_rented, true),
                    status = 'active',
                    contact_number = COALESCE(contact_number, '+966 50 123 4567'),
                    project_name = COALESCE(project_name, 'SABIC / Aramco Expansion')
                WHERE id = $1
            `, [camp.id]);
        }

        // 2. Ensure rooms have valid daily_rate and daily_food_rate
        const roomsRes = await client.query('SELECT id, camp_id, max_capacity, room_number, category FROM public.rooms');
        const rooms = roomsRes.rows;
        console.log(`Found ${rooms.length} rooms`);

        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            const rate = 35 + (i % 5) * 10; // 35, 45, 55, 65, 75 SAR
            const foodRate = 20 + (i % 3) * 5; // 20, 25, 30 SAR
            await client.query(`
                UPDATE public.rooms
                SET daily_rate = COALESCE(NULLIF(daily_rate, 0), $1),
                    daily_food_rate = COALESCE(NULLIF(daily_food_rate, 0), $2),
                    ac = true,
                    attached_bathroom = true
                WHERE id = $3
            `, [rate, foodRate, r.id]);
        }

        // 3. Mark a few rooms as under_maintenance and reserved for KPI visibility
        if (rooms.length >= 6) {
            await client.query(`UPDATE public.rooms SET status = 'under_maintenance', current_occupancy = 0 WHERE id IN ($1, $2, $3)`, 
                [rooms[0].id, rooms[1].id, rooms[2].id]);
            await client.query(`UPDATE public.rooms SET status = 'reserved', current_occupancy = 0 WHERE id IN ($1, $2)`, 
                [rooms[3].id, rooms[4].id]);
        }

        // 4. Create more employees with diverse profiles
        const nationalities = ['Saudi', 'Filipino', 'Indian', 'Pakistani', 'Egyptian', 'Nepalese'];
        const departments = ['Engineering', 'Operations', 'Maintenance', 'Catering', 'Safety', 'Civil', 'Logistics'];
        const designations = ['Civil Engineer', 'Mechanical Tech', 'Electrician', 'Plumber', 'HSE Officer', 'Camp Supervisor', 'Cook', 'Driver', 'HVAC Specialist', 'Scaffolder'];
        const suppliers = ['Own', 'Al-Falak Contracting', 'Nesma Partners', 'Bin Quraya', 'Rawabi Holding'];
        const presenceStatuses = ['active', 'on_site', 'vacation', 'away'];

        const newEmployeeIds: string[] = [];

        for (let i = 11; i <= 85; i++) {
            const empCode = `EMP${String(i).padStart(3, '0')}`;
            const firstNames = ['Khalid', 'Tariq', 'Sultan', 'Fahad', 'Arun', 'Ramesh', 'Vijay', 'Mark', 'Angelo', 'Ramon', 'Bilal', 'Imran', 'Hassan', 'Mahmoud', 'Omar'];
            const lastNames = ['Al-Ghamdi', 'Al-Otaibi', 'Al-Harbi', 'Sharma', 'Patel', 'Kumar', 'Santos', 'Reyes', 'Cruz', 'Khan', 'Siddiqui', 'Ibrahim', 'Farouk'];
            const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
            const dept = departments[i % departments.length];
            const desig = designations[i % designations.length];
            const nat = nationalities[i % nationalities.length];
            const supp = suppliers[i % suppliers.length];
            const empType = supp === 'Own' ? 'direct' : 'supplier';
            const pres = presenceStatuses[i % presenceStatuses.length];
            const camp = camps[i % camps.length];

            const empInsert = await client.query(`
                INSERT INTO public.employees (
                    employee_id, name, department, designation, nationality, 
                    supplier_name, employee_type, presence_status, status, 
                    camp_id, join_date, phone, email, is_blacklisted
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, CURRENT_DATE - (interval '1 day' * $10), $11, $12, false)
                ON CONFLICT (employee_id) DO UPDATE SET 
                    department = EXCLUDED.department,
                    designation = EXCLUDED.designation,
                    presence_status = EXCLUDED.presence_status,
                    camp_id = EXCLUDED.camp_id
                RETURNING id;
            `, [
                empCode, name, dept, desig, nat, 
                supp, empType, pres, camp.id, 
                (i * 3) % 180, `+966 5${(10000000 + i * 37)}`, 
                `${empCode.toLowerCase()}@expertise.com`
            ]);

            newEmployeeIds.push(empInsert.rows[0].id);
        }
        console.log(`Seeded / updated 75 employees`);

        // 5. Fetch all active employees and assign them into rooms
        const allEmpRes = await client.query(`SELECT id, camp_id FROM public.employees WHERE status = 'active'`);
        const allEmployees = allEmpRes.rows;

        // Reset all available rooms occupancy to 0 first (except maintenance & reserved)
        await client.query(`
            UPDATE public.rooms 
            SET current_occupancy = 0, status = 'vacant'
            WHERE status NOT IN ('under_maintenance', 'reserved')
        `);

        // Distribute employees into rooms
        const availableRooms = (await client.query(`
            SELECT id, camp_id, max_capacity 
            FROM public.rooms 
            WHERE status NOT IN ('under_maintenance', 'reserved')
            ORDER BY camp_id, room_number
        `)).rows;

        let roomIdx = 0;
        let roomOccupantsCount: Record<string, number> = {};

        for (const emp of allEmployees) {
            // Find a room in the employee's camp that has free capacity
            let assignedRoom = availableRooms.find(r => r.camp_id === emp.camp_id && (roomOccupantsCount[r.id] || 0) < r.max_capacity);
            
            // If none in same camp, pick any available room
            if (!assignedRoom) {
                assignedRoom = availableRooms.find(r => (roomOccupantsCount[r.id] || 0) < r.max_capacity);
            }

            if (assignedRoom) {
                roomOccupantsCount[assignedRoom.id] = (roomOccupantsCount[assignedRoom.id] || 0) + 1;
                await client.query(`
                    UPDATE public.employees 
                    SET room_id = $1, camp_id = $2
                    WHERE id = $3
                `, [assignedRoom.id, assignedRoom.camp_id, emp.id]);
            }
        }

        // Update room current_occupancy and status based on assigned employees
        for (const r of availableRooms) {
            const occ = roomOccupantsCount[r.id] || 0;
            let status = 'vacant';
            if (occ >= r.max_capacity) status = 'occupied';
            else if (occ > 0) status = 'partially_occupied';

            await client.query(`
                UPDATE public.rooms 
                SET current_occupancy = $1, status = $2
                WHERE id = $3
            `, [occ, status, r.id]);
        }
        console.log(`Updated room occupancies across ${availableRooms.length} rooms`);

        // 6. Seed check_ins and check_outs for historical and month KPIs
        const empWithRooms = (await client.query(`
            SELECT id, camp_id, room_id 
            FROM public.employees 
            WHERE room_id IS NOT NULL 
            LIMIT 60
        `)).rows;

        for (let i = 0; i < empWithRooms.length; i++) {
            const e = empWithRooms[i];
            const checkInDaysAgo = 10 + (i % 90);
            
            await client.query(`
                INSERT INTO public.check_ins (
                    employee_id, room_id, camp_id, check_in_date, food_required, project
                ) VALUES ($1, $2, $3, NOW() - (interval '1 day' * $4), true, 'Infrastructure Camp')
                ON CONFLICT DO NOTHING
            `, [e.id, e.room_id, e.camp_id, checkInDaysAgo]);

            // Add check_out for some of them
            if (i % 3 === 0) {
                const checkOutDaysAgo = Math.max(1, checkInDaysAgo - 20);
                await client.query(`
                    INSERT INTO public.check_outs (
                        employee_id, room_id, camp_id, check_out_date, clearance_notes, 
                        assets_returned, feedback_rating, feedback
                    ) VALUES ($1, $2, $3, NOW() - (interval '1 day' * $4), 'Contract completed - regular checkout', true, 5, 'Satisfactory stay and food')
                    ON CONFLICT DO NOTHING
                `, [e.id, e.room_id, e.camp_id, checkOutDaysAgo]);
            }
        }
        console.log(`Seeded check-ins and check-outs`);

        // 7. Seed camp_utilities (Electricity, Water, Sewage, Internet) for each camp
        const utilityTypes = ['Electricity', 'Water', 'Sewage', 'Internet', 'Gas'];
        for (const camp of camps) {
            for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
                for (const uType of utilityTypes) {
                    const amount = (uType === 'Electricity' ? 4500 : uType === 'Water' ? 2200 : 1200) + (Math.floor(Math.random() * 500));
                    await client.query(`
                        INSERT INTO public.camp_utilities (
                            camp_id, month, utility_type, amount, notes
                        ) VALUES ($1, (DATE_TRUNC('month', CURRENT_DATE) - (interval '1 month' * $2))::date, $3, $4, 'Monthly utility bill')
                        ON CONFLICT DO NOTHING
                    `, [camp.id, monthOffset, uType, amount]);
                }
            }
        }
        console.log(`Seeded camp utilities for past 4 months`);

        // 8. Seed Audit Logs for "Recent Activities" on Dashboard
        const auditActions = [
            { action: 'CHECK_IN', table: 'check_ins', text: 'Checked in employee into room' },
            { action: 'ROOM_ALLOCATION', table: 'rooms', text: 'Allocated bed in Block A' },
            { action: 'MAINTENANCE_CREATED', table: 'maintenance_tickets', text: 'Reported AC malfunction' },
            { action: 'INVENTORY_ISSUE', table: 'catering_issues', text: 'Issued weekly grocery supplies' },
            { action: 'CHECK_OUT', table: 'check_outs', text: 'Completed clearance and checkout' },
            { action: 'AUDIT_INSPECTION', table: 'food_safety_audits', text: 'Passed food safety hygiene audit' },
        ];

        for (let i = 0; i < 20; i++) {
            const act = auditActions[i % auditActions.length];
            const camp = camps[i % camps.length];
            await client.query(`
                INSERT INTO public.audit_logs (
                    action, table_name, details, created_at
                ) VALUES ($1, $2, $3, NOW() - (interval '1 hour' * $4))
            `, [
                act.action, 
                act.table, 
                JSON.stringify({ description: act.text, camp_name: camp.name, user: 'Admin' }),
                i * 3 + 1
            ]);
        }
        console.log(`Seeded audit logs for operational activity feed`);

        // 9. Seed sample food cancellation requests
        const sampleEmps = allEmployees.slice(0, 10);
        for (let i = 0; i < sampleEmps.length; i++) {
            const emp = sampleEmps[i];
            const camp = camps[i % camps.length];
            const reqInsert = await client.query(`
                INSERT INTO public.food_cancellation_requests (
                    employee_id, camp_id, reason, status, source, from_date, to_date, remarks
                ) VALUES ($1, $2, 'official_duty', 'approved', 'manual', CURRENT_DATE, CURRENT_DATE + interval '3 days', 'Site assignment duty')
                RETURNING id
            `, [emp.id, camp.id]);

            const reqId = reqInsert.rows[0].id;
            await client.query(`
                INSERT INTO public.food_cancellation_request_meals (
                    request_id, meal_type
                ) VALUES 
                    ($1, 'breakfast'),
                    ($1, 'lunch'),
                    ($1, 'dinner')
            `, [reqId]);
        }
        console.log(`Seeded food cancellation requests & meals`);

        // 10. Seed Violations / Safety NCRs
        for (let i = 0; i < 5; i++) {
            const camp = camps[i % camps.length];
            const compEmp = allEmployees[i];
            const accEmp = allEmployees[(i + 5) % allEmployees.length];
            const types = ['Noise Disturbance', 'Unauthorized Hotplate Cooking', 'Smoking Inside Accommodation', 'Personal Protective Equipment'];
            await client.query(`
                INSERT INTO public.violations (
                    camp_id, complainant_employee_id, accused_employee_id, violation_type, description, status, action_taken
                ) VALUES ($1, $2, $3, $4, $5, 'action_taken', 'Formal verbal warning and safety induction')
            `, [camp.id, compEmp.id, accEmp.id, types[i % types.length], `Reported safety policy non-compliance in block ${i + 1}`]);
        }
        console.log(`Seeded camp safety violations`);

        await client.query('COMMIT');
        console.log('✅ All rich KPI seed data successfully committed!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedRichKpis();
