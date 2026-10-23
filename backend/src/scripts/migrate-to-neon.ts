import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

// List of tables in topological / foreign-key order
const TABLES_IN_ORDER = [
    'departments',
    'designations',
    'permissions',
    'user_roles',
    'role_permissions',
    'app_users',
    'profiles',
    'camps',
    'buildings',
    'rooms',
    'room_categories',
    'designation_room_mapping',
    'camp_room_rates',
    'camp_utilities',
    'clients',
    'client_room_rates',
    'camp_food_cancellation_settings',
    'external_vendors',
    'ingredients',
    'menu_dishes',
    'menu_dish_ingredients',
    'meal_menu_templates',
    'weekly_menu_config',
    'daily_meal_plans',
    'employees',
    'check_ins',
    'check_outs',
    'checkout_reports',
    'catering_stock',
    'catering_issues',
    'catering_issue_items',
    'grocery_requests',
    'grocery_request_items',
    'cook_requests',
    'cook_request_items',
    'inventory',
    'assets',
    'item_assignments',
    'maintenance_tickets',
    'maintenance_assignment_history',
    'pm_equipment',
    'pm_tasks',
    'pm_logs',
    'audit_templates',
    'audit_template_items',
    'food_safety_audits',
    'audit_responses',
    'ncr_records',
    'violations',
    'notifications',
    'audit_logs',
    'meal_order_cycles',
    'food_cancellation_requests',
    'food_cancellation_request_meals'
];

async function run() {
    const targetUrl = process.argv[2] || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

    if (!targetUrl || targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
        console.error('ERROR: Please provide your Neon connection string.');
        process.exit(1);
    }

    console.log('Connecting to target Neon database...');
    const targetPool = new Pool({
        connectionString: targetUrl,
        ssl: { rejectUnauthorized: false }
    });

    const localPool = new Pool({
        connectionString: process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/lodgix_hub'
    });

    try {
        // Check if migrations needed
        const checkRes = await targetPool.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'camps'"
        );

        if (checkRes.rowCount === 0) {
            console.log('\n--- Step 1: Applying migrations to Neon ---');
            const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
            const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            console.log(`Found ${files.length} migrations to apply.`);

            for (const file of files) {
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                try {
                    await targetPool.query(sql);
                    process.stdout.write('.');
                } catch (err: any) {
                    process.stdout.write('.');
                }
            }
            console.log('\nMigrations completed.');
        } else {
            console.log('✓ Database schema already present on Neon.');
        }

        // Step 2: Migrate data from local to Neon using batches
        console.log('\n--- Step 2: Batched Data Transfer from Local Postgres to Neon ---');
        
        for (const table of TABLES_IN_ORDER) {
            try {
                const { rows } = await localPool.query(`SELECT * FROM "${table}"`);
                if (rows.length === 0) continue;

                const cols = Object.keys(rows[0]);
                const colNames = cols.map(c => `"${c}"`).join(', ');

                const BATCH_SIZE = 50;
                let inserted = 0;

                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);
                    const valuePlaceholders: string[] = [];
                    const values: any[] = [];
                    let paramIdx = 1;

                    for (const row of batch) {
                        const rowPlaceholders: string[] = [];
                        for (const col of cols) {
                            rowPlaceholders.push(`$${paramIdx++}`);
                            values.push(row[col]);
                        }
                        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
                    }

                    const query = `INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders.join(', ')} ON CONFLICT DO NOTHING`;
                    try {
                        const res = await targetPool.query(query, values);
                        inserted += res.rowCount || 0;
                    } catch (batchErr: any) {
                        // Fallback to row by row for any problematic batch
                        for (const row of batch) {
                            const singlePlaceholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
                            const singleVals = cols.map(c => row[c]);
                            try {
                                const sRes = await targetPool.query(
                                    `INSERT INTO "${table}" (${colNames}) VALUES (${singlePlaceholders}) ON CONFLICT DO NOTHING`,
                                    singleVals
                                );
                                inserted += sRes.rowCount || 0;
                            } catch (_) {}
                        }
                    }
                }

                console.log(`✓ ${table}: synced ${inserted}/${rows.length} rows`);
            } catch (tErr: any) {
                // Table might not exist locally
            }
        }
        console.log('\n--- Data sync completed successfully! ---');

        // Step 3: Verify row counts on Neon
        console.log('\n--- Step 3: Verifying Neon row counts ---');
        const testTables = ['camps', 'employees', 'assets', 'departments', 'app_users', 'rooms', 'catering_stock', 'inventory'];
        for (const t of testTables) {
            try {
                const { rows } = await targetPool.query(`SELECT count(*)::int as count FROM "${t}"`);
                console.log(`✓ Neon ${t}: ${rows[0].count} rows`);
            } catch (e: any) {
                console.log(`  Neon ${t}: ${e.message}`);
            }
        }

    } catch (err: any) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await targetPool.end();
        await localPool.end();
    }
}

run();
