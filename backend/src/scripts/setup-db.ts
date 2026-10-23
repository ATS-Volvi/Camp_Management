import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool, Client } = pg;

async function setup() {
    const databaseUrl = process.env.DATABASE_URL;
    const isNeonOrRemote = Boolean(databaseUrl && (databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=')));

    let pool: pg.Pool;

    if (databaseUrl && (isNeonOrRemote || process.env.PGHOST !== 'localhost')) {
        console.log(`Connecting directly to database via DATABASE_URL...`);
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: isNeonOrRemote ? { rejectUnauthorized: false } : undefined,
        });
    } else {
        const dbConfig = {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432'),
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
        };

        const dbName = process.env.PGDATABASE || 'lodgix_hub';

        console.log('Connecting to postgres to ensure database exists...');
        const client = new Client({ ...dbConfig, database: 'postgres' });
        
        try {
            await client.connect();
            const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
            if (res.rowCount === 0) {
                console.log(`Creating database ${dbName}...`);
                await client.query(`CREATE DATABASE ${dbName}`);
                console.log('Database created.');
            } else {
                console.log(`Database ${dbName} already exists.`);
            }
        } catch (err: any) {
            console.error('Error ensuring database exists:', err.message);
            console.error('TIP: Make sure your PGPASSWORD in .env is correct.');
            process.exit(1);
        } finally {
            await client.end();
        }

        console.log(`Connecting to ${dbName} to run migrations...`);
        pool = new Pool({ ...dbConfig, database: dbName });
    }

    try {
        // Updated path to database/migrations
        const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error(`Migrations directory not found: ${migrationsDir}`);
            process.exit(1);
        }

        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        console.log(`Found ${files.length} migrations to apply.`);

        for (const file of files) {
            console.log(`Applying migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            
            try {
                await pool.query(sql);
            } catch (migrationErr: any) {
                const msg = migrationErr.message.toLowerCase();
                const skippable = [
                    'already exists',
                    'does not exist',
                    'policy',
                    'auth.',
                    'authenticated',
                    'anon',
                    'service_role',
                    'cannot change return type'
                ];
                
                if (skippable.some(s => msg.includes(s))) {
                    console.warn(`[SKIP] Migration ${file} had a skippable error: ${migrationErr.message}`);
                } else {
                    console.error(`Error in migration ${file}:`, migrationErr.message);
                    throw migrationErr;
                }
            }
        }
        console.log('All migrations applied successfully.');
    } catch (err: any) {
        console.error('Error running migrations:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setup();
