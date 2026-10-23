import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import bcrypt from 'bcrypt';
import EmployeesDatabase from './database';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

const roleAppRoleMap: Record<string, string> = {
  'Warden': 'Camp Manager',
  'Supervisor': 'Camp Manager',
  'Electrician': 'Maintenance Supervisor',
  'Plumber': 'Maintenance Supervisor',
  'Security Guard': 'Security',
  'Cook': 'Store Keeper',
  'Cleaner': 'Store Keeper',
  'Driver': 'Store Keeper',
};

class EmployeesService {
    static async getAllEmployees(filters: any, next: NextFunction) {
        try {
            return await EmployeesDatabase.getAllEmployees(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getEmployeeById(id: string, next: NextFunction) {
        try {
            const emp = await EmployeesDatabase.getEmployeeById(id);
            if (!emp) return next(createError({ status: 404, message: 'Not found' }));
            return emp;
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createEmployees(data: any, next: NextFunction) {
        const emps = Array.isArray(data) ? data : [data];
        const results = [];
        try {
            for (const emp of emps) {
                const res = await EmployeesDatabase.createEmployee(emp);
                results.push(res);
            }
            return Array.isArray(data) ? results : results[0];
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async updateEmployee(id: string, updates: any, next: NextFunction) {
        try {
            return await EmployeesDatabase.updateEmployee(id, updates);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createStaffLogin(data: any, next: NextFunction) {
        const { email, password, employee_id, staff_role } = data;
        const appRole = roleAppRoleMap[staff_role] || 'Security';
        
        try {
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const userId = uuidv4();
            const emp = await EmployeesDatabase.getEmployeeById(employee_id);
            const fullName = emp?.name || 'Staff Member';

            await EmployeesDatabase.createStaffLoginTransaction({
                userId,
                email,
                passwordHash,
                appRole,
                employeeId: employee_id,
                fullName
            });

            return { message: 'Login created', role: appRole };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async changePresenceStatus(id: string, data: any, next: NextFunction) {
        try {
            const { status, reason, changedBy } = data;
            return await EmployeesDatabase.changePresenceStatus(id, status, reason, changedBy);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default EmployeesService;
