import pg from 'pg';
import { variables } from './envLoader';

const { Pool } = pg;

class Database {
    private static pool: pg.Pool;

    public static async createConnection() {
        if (this.pool) return this.pool;

        const isNeonOrRemote = 
            Boolean(variables.DATABASE_URL && (variables.DATABASE_URL.includes('neon.tech') || variables.DATABASE_URL.includes('sslmode='))) ||
            (variables.PGHOST && variables.PGHOST !== 'localhost' && variables.PGHOST !== '127.0.0.1');

        const poolConfig: pg.PoolConfig = variables.DATABASE_URL 
            ? { 
                connectionString: variables.DATABASE_URL,
                ssl: isNeonOrRemote ? { rejectUnauthorized: false } : undefined,
              }
            : {
                host: variables.PGHOST,
                port: parseInt(variables.PGPORT || '5432'),
                user: variables.PGUSER,
                password: variables.PGPASSWORD,
                database: variables.PGDATABASE,
                ssl: isNeonOrRemote ? { rejectUnauthorized: false } : undefined,
              };

        // pg's default closes idle connections after 10s, so any request after a short pause paid a fresh
        // TLS + auth handshake to Neon per parallel query (~7s cold vs ~2s warm). Keep them for 5 minutes.
        this.pool = new Pool({ ...poolConfig, idleTimeoutMillis: 300_000, keepAlive: true });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });

        // this.pool.on('connect', () => {
        //     console.log('Database pool connected');
        // });

        // Test connection
        try {
            await this.pool.query('SELECT NOW()');
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }

        return this.pool;
    }

    public static getPool() {
        return this.pool;
    }
}

export default Database;
