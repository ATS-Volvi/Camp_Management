import { pool } from '../lib/db.js';

async function seedCampsAndCatering() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Seeding for Camps, Occupancy & Catering ---');
        await client.query('BEGIN');

        // 1. Check camps
        const campsRes = await client.query('SELECT id, name FROM public.camps ORDER BY name');
        const camps = campsRes.rows;
        console.log(`Found ${camps.length} camps:`, camps.map(c => `${c.name} (${c.id})`));

        const mainCampAlpha = camps.find(c => c.id === 'c1111111-1111-1111-1111-111111111111') || camps.find(c => c.name.includes('Alpha')) || camps[0];
        const workerVillageBeta = camps.find(c => c.id === 'c2222222-2222-2222-2222-222222222222') || camps.find(c => c.name.includes('Beta')) || camps[1];

        // 2. Ensure buildings exist for camps that have none
        for (const camp of camps) {
            const bRes = await client.query('SELECT id FROM public.buildings WHERE camp_id = $1', [camp.id]);
            if (bRes.rows.length === 0) {
                console.log(`Creating buildings for ${camp.name}...`);
                await client.query(`
                    INSERT INTO public.buildings (camp_id, name, floors)
                    VALUES 
                        ($1, 'Block A - Main Dormitory', 2),
                        ($1, 'Block B - Staff Residence', 2)
                `, [camp.id]);
            }
        }

        // 3. Ensure rooms exist for Main Camp Alpha and Worker Village Beta
        for (const camp of [mainCampAlpha, workerVillageBeta]) {
            if (!camp) continue;
            const rRes = await client.query('SELECT id FROM public.rooms WHERE camp_id = $1', [camp.id]);
            if (rRes.rows.length === 0) {
                console.log(`Creating rooms for ${camp.name}...`);
                const bRes = await client.query('SELECT id, name FROM public.buildings WHERE camp_id = $1 ORDER BY name', [camp.id]);
                const buildings = bRes.rows;

                for (let bIdx = 0; bIdx < buildings.length; bIdx++) {
                    const b = buildings[bIdx];
                    const prefix = b.name.includes('Block A') ? 'A' : 'B';
                    for (let rNum = 101; rNum <= 106; rNum++) {
                        const roomNumber = `${prefix}-${rNum}`;
                        const maxCap = 4;
                        await client.query(`
                            INSERT INTO public.rooms (
                                building_id, camp_id, room_number, floor, category, max_capacity, current_occupancy, status, daily_rate, daily_food_rate, ac, attached_bathroom
                            ) VALUES (
                                $1, $2, $3, 1, '4_occupants', $4, 0, 'vacant', 45, 25, true, true
                            )
                        `, [b.id, camp.id, roomNumber, maxCap]);
                    }
                }
            }
        }

        // 4. Ensure employees are allocated to rooms in Main Camp Alpha and Worker Village Beta
        for (const camp of [mainCampAlpha, workerVillageBeta]) {
            if (!camp) continue;
            const empCountRes = await client.query('SELECT count(*) FROM public.employees WHERE camp_id = $1', [camp.id]);
            const empCount = parseInt(empCountRes.rows[0].count);

            const roomsRes = await client.query('SELECT id, max_capacity, room_number FROM public.rooms WHERE camp_id = $1 ORDER BY room_number', [camp.id]);
            const rooms = roomsRes.rows;

            if (empCount < 18 && rooms.length > 0) {
                console.log(`Adding and allocating employees for ${camp.name}...`);
                const nationalities = ['Saudi', 'Filipino', 'Indian', 'Pakistani', 'Egyptian'];
                const departments = ['Engineering', 'Operations', 'Maintenance', 'Logistics', 'Catering'];
                const designations = ['Civil Tech', 'Electrician', 'Plumber', 'Supervisor', 'Cook', 'Driver'];
                const prefix = camp.name.includes('Alpha') ? 'ALPHA' : 'BETA';

                let roomIdx = 0;

                for (let i = 1; i <= 22; i++) {
                    const targetRoom = rooms[roomIdx % rooms.length];
                    const empCode = `EMP-${prefix}-${100 + i}`;
                    const name = `${['Ahmad', 'Mohammed', 'Carlos', 'Rajesh', 'Ali', 'Zubair', 'Farooq', 'Tariq', 'Sultan', 'Rami'][i % 10]} ${['Al-Ghamdi', 'Santos', 'Sharma', 'Khan', 'Mansour', 'Siddiqui', 'Hassan', 'Otaibi'][i % 8]}`;
                    
                    const insEmp = await client.query(`
                        INSERT INTO public.employees (
                            employee_id, name, department, designation, nationality, 
                            supplier_name, employee_type, presence_status, status, 
                            camp_id, join_date, phone, email, is_blacklisted
                        ) VALUES (
                            $1, $2, $3, $4, $5, 
                            'Nesma Partners', 'supplier', 'on_site', 'active', 
                            $6, CURRENT_DATE - 30, $7, $8, false
                        ) ON CONFLICT (employee_id) DO UPDATE SET camp_id = EXCLUDED.camp_id
                        RETURNING id
                    `, [
                        empCode, name, departments[i % departments.length], designations[i % designations.length],
                        nationalities[i % nationalities.length], camp.id, `+966 5${20000000 + i * 43}`,
                        `${empCode.toLowerCase()}@campmanagement.com`
                    ]);

                    const empId = insEmp.rows[0].id;

                    // Add check-in record
                    await client.query(`
                        INSERT INTO public.check_ins (employee_id, room_id, camp_id, check_in_date)
                        VALUES ($1, $2, $3, CURRENT_DATE - 20)
                    `, [empId, targetRoom.id, camp.id]);

                    if (i % 2 === 0) {
                        roomIdx++;
                    }
                }

                // Update current_occupancy on rooms based on actual active check-ins
                for (const r of rooms) {
                    const occRes = await client.query(`
                        SELECT count(DISTINCT c.employee_id) 
                        FROM public.check_ins c
                        JOIN public.employees e ON e.id = c.employee_id
                        WHERE c.room_id = $1 AND e.status = 'active'
                          AND NOT EXISTS (
                              SELECT 1 FROM public.check_outs co 
                              WHERE co.employee_id = c.employee_id AND co.check_out_date > c.check_in_date
                          )
                    `, [r.id]);
                    const occ = Math.min(parseInt(occRes.rows[0].count), r.max_capacity);
                    const status = occ >= r.max_capacity ? 'occupied' : occ > 0 ? 'partially_occupied' : 'vacant';
                    await client.query('UPDATE public.rooms SET current_occupancy = $1, status = $2 WHERE id = $3', [occ, status, r.id]);
                }
                console.log(`Updated room occupancies for ${camp.name}`);
            }
        }

        // 5. Ensure Ingredients Master is rich
        const defaultIngredients = [
            { name: 'Basmati Rice', unit: 'kg', category: 'Grains & Cereals', unit_cost: 7.50, reorder_level: 50 },
            { name: 'Fresh Chicken', unit: 'kg', category: 'Meat & Poultry', unit_cost: 16.00, reorder_level: 40 },
            { name: 'Mutton / Beef', unit: 'kg', category: 'Meat & Poultry', unit_cost: 32.00, reorder_level: 25 },
            { name: 'Cooking Vegetable Oil', unit: 'liter', category: 'Oils & Fats', unit_cost: 8.25, reorder_level: 30 },
            { name: 'Yellow Onions', unit: 'kg', category: 'Vegetables', unit_cost: 3.50, reorder_level: 40 },
            { name: 'Red Tomatoes', unit: 'kg', category: 'Vegetables', unit_cost: 4.20, reorder_level: 35 },
            { name: 'Potatoes', unit: 'kg', category: 'Vegetables', unit_cost: 3.00, reorder_level: 50 },
            { name: 'Wheat Flour (Atta)', unit: 'kg', category: 'Grains & Cereals', unit_cost: 4.50, reorder_level: 40 },
            { name: 'Red Lentils (Masoor Dal)', unit: 'kg', category: 'Pulses & Legumes', unit_cost: 6.80, reorder_level: 20 },
            { name: 'Whole Milk', unit: 'liter', category: 'Dairy', unit_cost: 5.50, reorder_level: 30 },
            { name: 'Fresh Eggs', unit: 'tray', category: 'Dairy', unit_cost: 18.00, reorder_level: 15 },
            { name: 'Assorted Spices & Masala', unit: 'kg', category: 'Spices & Seasonings', unit_cost: 28.00, reorder_level: 10 },
            { name: 'Black Tea Leaves', unit: 'kg', category: 'Beverages', unit_cost: 22.00, reorder_level: 10 },
            { name: 'Sugar', unit: 'kg', category: 'Miscellaneous', unit_cost: 4.00, reorder_level: 25 },
            { name: 'Arabic Bread (Pita)', unit: 'pack', category: 'Bakery', unit_cost: 1.50, reorder_level: 50 },
        ];

        for (const ing of defaultIngredients) {
            await client.query(`
                INSERT INTO public.ingredients (name, unit, category, unit_cost, reorder_level, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
                ON CONFLICT (name) DO UPDATE 
                SET unit_cost = EXCLUDED.unit_cost, reorder_level = EXCLUDED.reorder_level
            `, [ing.name, ing.unit, ing.category, ing.unit_cost, ing.reorder_level]);
        }

        const ingRes = await client.query('SELECT id, name, unit, unit_cost FROM public.ingredients');
        const ingredients = ingRes.rows;
        console.log(`Ingredients in DB: ${ingredients.length}`);

        // 6. Ensure Catering Stock exists for each camp
        for (const camp of camps) {
            for (const ing of ingredients) {
                const openStock = 120 + Math.floor(Math.random() * 80);
                const stockIn = 60 + Math.floor(Math.random() * 100);
                const stockOut = 40 + Math.floor(Math.random() * 50);
                await client.query(`
                    INSERT INTO public.catering_stock (camp_id, ingredient_id, opening_stock, stock_in, stock_out, min_level)
                    VALUES ($1, $2, $3, $4, $5, 25)
                    ON CONFLICT (camp_id, ingredient_id) DO UPDATE
                    SET opening_stock = EXCLUDED.opening_stock, stock_in = EXCLUDED.stock_in, stock_out = EXCLUDED.stock_out
                `, [camp.id, ing.id, openStock, stockIn, stockOut]);
            }
        }
        console.log('Catering stock initialized across camps.');

        // 7. Seed Catering Issues (Issue Slips) & Items
        await client.query('DELETE FROM public.catering_issue_items');
        await client.query('DELETE FROM public.catering_issues');

        const cooks = ['Chef Ibrahim Al-Harbi', 'Head Cook Ramesh Babu', 'Chef Mohammad Karim', 'Cook Anthony Cruz'];
        const meals = ['Breakfast', 'Lunch', 'Dinner'];

        let issueSlipsCreated = 0;
        let issueItemsCreated = 0;

        for (const camp of camps) {
            // For the last 7 days
            for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
                for (const meal of meals) {
                    let mealIngredients = [];
                    if (meal === 'Breakfast') {
                        mealIngredients = ingredients.filter(i => ['Fresh Eggs', 'Arabic Bread (Pita)', 'Whole Milk', 'Black Tea Leaves', 'Sugar'].includes(i.name));
                    } else if (meal === 'Lunch') {
                        mealIngredients = ingredients.filter(i => ['Basmati Rice', 'Fresh Chicken', 'Cooking Vegetable Oil', 'Yellow Onions', 'Red Tomatoes', 'Assorted Spices & Masala'].includes(i.name));
                    } else { // Dinner
                        mealIngredients = ingredients.filter(i => ['Wheat Flour (Atta)', 'Red Lentils (Masoor Dal)', 'Mutton / Beef', 'Potatoes', 'Yellow Onions', 'Cooking Vegetable Oil'].includes(i.name));
                    }

                    if (mealIngredients.length === 0) {
                        mealIngredients = ingredients.slice(0, 3);
                    }

                    const itemsData = mealIngredients.map(ing => {
                        const qty = Math.round((6 + Math.random() * 12) * 10) / 10;
                        const cost = parseFloat((qty * parseFloat(ing.unit_cost)).toFixed(2));
                        return { ingredient_id: ing.id, qty, unit_cost: parseFloat(ing.unit_cost), cost };
                    });

                    const totalCost = parseFloat(itemsData.reduce((s, it) => s + it.cost, 0).toFixed(2));
                    const cook = cooks[(dayOffset + meal.length) % cooks.length];

                    const issueRes = await client.query(`
                        INSERT INTO public.catering_issues (
                            camp_id, issue_date, meal_type, cook_name, total_cost, created_at
                        ) VALUES (
                            $1, CURRENT_DATE - $2::integer, $3, $4, $5, now() - ($2 || ' days')::interval
                        ) RETURNING id
                    `, [camp.id, dayOffset, meal, cook, totalCost]);

                    const issueId = issueRes.rows[0].id;
                    issueSlipsCreated++;

                    for (const item of itemsData) {
                        await client.query(`
                            INSERT INTO public.catering_issue_items (
                                issue_id, ingredient_id, issued_qty, unit_cost, created_at
                            ) VALUES (
                                $1, $2, $3, $4, now() - ($5 || ' days')::interval
                            )
                        `, [issueId, item.ingredient_id, item.qty, item.unit_cost, dayOffset]);
                        issueItemsCreated++;
                    }
                }
            }
        }
        console.log(`Created ${issueSlipsCreated} catering issues with ${issueItemsCreated} items.`);

        // 8. Seed Grocery Requests (Cook Requests)
        for (const camp of camps) {
            const reqCheck = await client.query('SELECT count(*) FROM public.grocery_requests WHERE camp_id = $1', [camp.id]);
            if (parseInt(reqCheck.rows[0].count) < 3) {
                for (let r = 1; r <= 3; r++) {
                    const status = r === 1 ? 'submitted' : r === 2 ? 'approved' : 'draft';
                    const grRes = await client.query(`
                        INSERT INTO public.grocery_requests (
                            camp_id, request_date, meal_type, status, notes, created_at
                        ) VALUES (
                            $1, CURRENT_DATE + $2::integer, $3, $4, $5, now()
                        ) RETURNING id
                    `, [camp.id, r, meals[r % 3], status, `Daily provision request for ${meals[r % 3]} - batch #${100 + r}`]);

                    const grId = grRes.rows[0].id;
                    const sampleIngs = ingredients.slice(r * 2, r * 2 + 3);
                    for (const ing of sampleIngs) {
                        await client.query(`
                            INSERT INTO public.grocery_request_items (
                                request_id, ingredient_id, requested_qty, approved_qty
                            ) VALUES ($1, $2, $3, $4)
                        `, [grId, ing.id, 25, status === 'approved' ? 25 : null]);
                    }
                }
            }
        }
        console.log('Seeded pending and approved grocery requests for all camps.');

        await client.query('COMMIT');
        console.log('--- SEEDING COMPLETE SUCCESSFULLY ---');
        process.exit(0);
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedCampsAndCatering();
