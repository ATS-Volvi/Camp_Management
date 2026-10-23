import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool, Client } = pg;

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

async function setup() {
    const dbConfig = {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
    };

    const client = new Client({ ...dbConfig, database: 'postgres' });
    
    try {
        await client.connect();
        const dbName = process.env.PGDATABASE || 'lodgix_hub';
        
        // Ensure database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        if (res.rowCount === 0) {
            console.log(`Creating database ${dbName}...`);
            await client.query(`CREATE DATABASE ${dbName}`);
        }
    } catch (err: any) {
        console.error('Error ensuring database exists:', err.message);
    } finally {
        await client.end();
    }

    console.log('Connecting to lodgix_hub to run CSV migration...');
    const pool = new Pool({ ...dbConfig, database: process.env.PGDATABASE || 'lodgix_hub' });

    try {
        const dbDir = path.resolve(__dirname, '../../../database/source_data');
        if (!fs.existsSync(dbDir)) {
            console.error(`Folder ${dbDir} does not exist.`);
            process.exit(1);
        }

        const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.csv'));
        
        // Group files by table name and pick the latest timestamp for each
        const latestFiles = new Map();
        files.forEach(file => {
            const match = file.match(/^(.+)-export-(.+)\.csv$/);
            if (match) {
                const tableName = match[1];
                const timestamp = match[2];
                if (!latestFiles.has(tableName) || timestamp > latestFiles.get(tableName).timestamp) {
                    latestFiles.set(tableName, { file, timestamp });
                }
            }
        });

        console.log(`Found ${latestFiles.size} tables to migrate.`);

        const client = await pool.connect();
        try {
            await client.query("SET session_replication_role = 'replica'");
            
            const tablesToMigrate = [];
            for (const [tableName, { file }] of latestFiles.entries()) {
                const tableExistsRes = await client.query(`
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                `, [tableName]);
                if (tableExistsRes.rowCount > 0) {
                    tablesToMigrate.push({ tableName, file });
                } else {
                    console.warn(`Table ${tableName} does not exist in the database. Skipping.`);
                }
            }

            console.log(`Truncating ${tablesToMigrate.length} tables...`);
            for (const { tableName } of tablesToMigrate) {
                await client.query(`TRUNCATE TABLE public.${tableName} CASCADE`);
            }

            for (const { tableName, file } of tablesToMigrate) {
                console.log(`Migrating ${tableName}...`);
                
                // Get generated columns to skip them
                const genColsRes = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = $1 
                      AND is_generated = 'ALWAYS'
                `, [tableName]);
                const generatedColumns = new Set(genColsRes.rows.map(r => r.column_name));

                const filePath = path.join(dbDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
                if (lines.length < 2) continue;

                let headers = parseCSVLine(lines[0]).map(h => h.trim());
                
                // Filter out generated columns from headers and data
                const skipIndices = new Set();
                headers = headers.filter((h, i) => {
                    if (generatedColumns.has(h)) {
                        skipIndices.add(i);
                        return false;
                    }
                    return true;
                });

                const columns = headers.join(', ');
                const placeholders = headers.map((_, i) => `$${i + 1}`).join(', ');

                let successCount = 0;
                let skipCount = 0;
                let errorCount = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0) {
                        skipCount++;
                        continue;
                    }
                    
                    const filteredValues = values.filter((_, idx) => !skipIndices.has(idx));
                    if (filteredValues.length !== headers.length) {
                        skipCount++;
                        continue;
                    }

                    const processedValues = filteredValues.map(v => {
                        const trimmed = v.trim();
                        if (trimmed === '' || trimmed === 'NULL') return null;
                        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                if (Array.isArray(parsed)) {
                                    return '{' + parsed.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',') + '}';
                                }
                            } catch (e) {}
                        }
                        return trimmed;
                    });
                    try {
                        await client.query(`INSERT INTO public.${tableName} (${columns}) VALUES (${placeholders})`, processedValues);
                        successCount++;
                    } catch (e: any) {
                        if (errorCount < 1) console.error(`Error inserting into ${tableName} at line ${i+1}:`, e.message);
                        errorCount++;
                    }
                }
                console.log(`Table ${tableName}: ${successCount} inserted, ${skipCount} skipped, ${errorCount} errors.`);
            }
            await client.query("SET session_replication_role = 'origin'");
            console.log('CSV migration completed successfully.');
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error('Error running CSV migration:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

function parseCSVLine(line: string) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

setup().catch(err => {
    console.error('Final catch error:', err);
    process.exit(1);
});
