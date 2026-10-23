import { pool } from '../lib/db.js';

async function seedMoreData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if departments table exists, create if not
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.departments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                code TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // Check if designations table exists, create if not
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.designations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                department_id UUID REFERENCES public.departments(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // Insert Departments
        const departments = [
            { name: 'Engineering', code: 'ENG' },
            { name: 'Operations', code: 'OPS' },
            { name: 'Maintenance', code: 'MNT' },
            { name: 'Catering', code: 'CAT' },
            { name: 'Security', code: 'SEC' },
            { name: 'Human Resources', code: 'HR' }
        ];

        for (const dept of departments) {
            await client.query(
                `INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
                [dept.name, dept.code]
            );
        }

        // Fetch department IDs
        const deptRes = await client.query('SELECT id, name FROM departments');
        const deptMap = {};
        for (const row of deptRes.rows) {
            deptMap[row.name] = row.id;
        }

        // Insert Designations
        const designations = [
            'Software Engineer', 'Civil Engineer', 'Camp Manager', 
            'Operations Coordinator', 'Plumber', 'Electrician', 
            'Head Chef', 'Kitchen Staff', 'Security Guard', 'HR Manager'
        ];

        for (const desig of designations) {
            await client.query(
                `INSERT INTO designations (name, is_active) VALUES ($1, true) ON CONFLICT (name) DO NOTHING`,
                [desig]
            );
        }

        // Insert More Employees
        const newEmployees = [
            { id: 'EMP006', name: 'Alice Cooper', department: 'Human Resources', designation: 'HR Manager' },
            { id: 'EMP007', name: 'Bob Marley', department: 'Maintenance', designation: 'Plumber' },
            { id: 'EMP008', name: 'Charlie Chaplin', department: 'Engineering', designation: 'Civil Engineer' },
            { id: 'EMP009', name: 'David Bowie', department: 'Catering', designation: 'Head Chef' },
            { id: 'EMP010', name: 'Eve Polastri', department: 'Security', designation: 'Security Guard' }
        ];

        // Ensure employee columns for designation exist (maybe we need to alter table if designation is not there? Wait, employees table has `department` but what about `designation`?)
        // Let's add designation if it doesn't exist
        await client.query(`
            ALTER TABLE public.employees 
            ADD COLUMN IF NOT EXISTS designation TEXT;
        `);

        for (const emp of newEmployees) {
            await client.query(
                `INSERT INTO employees (employee_id, name, department, designation) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (employee_id) DO NOTHING`,
                [emp.id, emp.name, emp.department, emp.designation]
            );
        }

        await client.query('COMMIT');
        console.log('Successfully seeded departments, designations, and more employees!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Seeding failed:', e);
    } finally {
        client.release();
        process.exit();
    }
}

seedMoreData();
