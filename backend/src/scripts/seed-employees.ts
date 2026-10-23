import { pool } from '../lib/db.js';

async function seedEmployees() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Let's get a camp ID to assign them to if needed, though employees are general
        
        const employees = [
            { id: 'EMP001', name: 'John Doe', department: 'Engineering' },
            { id: 'EMP002', name: 'Jane Smith', department: 'Operations' },
            { id: 'EMP003', name: 'Mike Johnson', department: 'Maintenance' },
            { id: 'EMP004', name: 'Sarah Williams', department: 'Catering' },
            { id: 'EMP005', name: 'Robert Brown', department: 'Security' }
        ];

        for (const emp of employees) {
            await client.query(
                `INSERT INTO employees (employee_id, name, department) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (employee_id) DO NOTHING`,
                [emp.id, emp.name, emp.department]
            );
        }

        await client.query('COMMIT');
        console.log('Successfully seeded 5 employees!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

seedEmployees();
