import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import DataDatabase from './database';
import Database from '../../../../config/dbConn';

const SAFE_TABLES = [
    'inventory', 'assets', 'maintenance_tickets', 'maintenance_assignment_history',
    'catering_issues', 'catering_issue_items', 'catering_consumption_logs',
    'daily_meal_plans', 'menu_dishes', 'ingredients', 'menu_dish_ingredients',
    'grocery_requests', 'grocery_request_items', 'food_safety_audits',
    'food_wastage', 'violations', 'room_change_requests', 'camp_transfer_requests',
    'ncr_records', 'audit_responses', 'audit_templates', 'audit_template_items',
    'camps', 'rooms', 'buildings', 'mess_facilities', 'visitors', 'check_ins', 'check_outs',
    'profiles', 'catering_stock', 'departments', 'designations', 'user_roles', 'permissions', 
    'role_permissions', 'audit_logs', 'item_assignments', 'cook_requests', 'purchase_orders', 
    'camp_utilities', 'camp_supplier_costs', 'camp_room_rates', 'grocery_inventory', 
    'employees', 'checkout_reports', 'external_vendors', 'asset_assignments', 
    'asset_handover_history', 'pm_equipment', 'pm_tasks', 'pm_logs',
    'meal_order_cycles', 'meal_orders', 'meal_order_items', 'meal_scans',
    'catering_invoices', 'meal_menu_templates', 'transfer_requests', 'room_transfers',
    'room_categories', 'designation_room_mapping', 'cook_request_items', 'purchase_order_items',
    'clients', 'client_room_rates', 'employee_status_log', 'camp_food_cancellation_settings',
    'employee_shift_assignments', 'food_cancellation_requests', 'food_cancellation_request_meals',
    'asset_maintenance_log', 'room_category_master'
];

class DataService {
    static async getData(table: string, filters: any, next: NextFunction) {
        if (!SAFE_TABLES.includes(table)) return next(createError({ status: 403, message: 'Unauthorized table' }));
        try {
            const select = filters.select || '*';
            let query = `SELECT * FROM ${table}`; 
            const values: any[] = [];
            const where: string[] = [];

            const SUFFIX_OPS: Record<string, string> = {
                '_gte': '>=', '_gt': '>', '_lte': '<=', '_lt': '<', '_neq': '!='
            };

            for (const [key, val] of Object.entries(filters)) {
                if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset' || key === 'single' || key === 'maybeSingle') continue;

                let column = key;
                let operator = '=';
                let value: any = val;

                // Handle dot-notation in filters (e.g. meal_orders.employee_id)
                if (column.includes('.')) {
                    const [refTable, refColumn] = column.split('.');
                    let fk = `${refTable.replace(/s$/, '')}_id`;
                    if (refTable === 'meal_orders') fk = 'meal_order_id';
                    
                    const op = typeof val === 'string' && val.includes('.') ? val.split('.')[0] : 'eq';
                    const actualVal = typeof val === 'string' && val.includes('.') ? val.split('.').slice(1).join('.') : val;
                    const sqlOp = op === 'eq' ? '=' : op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : op === 'lte' ? '<=' : '=';
                    
                    values.push(actualVal);
                    where.push(`${fk} IN (SELECT id FROM ${refTable} WHERE ${refColumn} ${sqlOp} $${values.length})`);
                    continue;
                }

                let suffixHandled = false;
                for (const [suffix, op] of Object.entries(SUFFIX_OPS)) {
                    if (key.endsWith(suffix)) {
                        column = key.slice(0, -suffix.length);
                        operator = op;
                        suffixHandled = true;
                        break;
                    }
                }

                if (!suffixHandled && typeof val === 'string' && val.includes('.')) {
                    const parts = val.split('.');
                    const op = parts[0];
                    const rest = parts.slice(1).join('.');

                    if (op === 'is') {
                        if (rest === 'null') {
                            where.push(`${column} IS NULL`);
                        } else {
                            where.push(`${column} IS NOT NULL`);
                        }
                        continue;
                    }

                    if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in'].includes(op)) {
                        column = key;
                        if (op === 'in') {
                            operator = 'IN';
                            const valuesArray = rest.replace(/^\(|\)$/g, '').split(',');
                            const placeholders = valuesArray.map((_, j) => `$${values.length + j + 1}`).join(', ');
                            where.push(`${column} IN (${placeholders})`);
                            values.push(...valuesArray);
                            continue;
                        } else {
                            operator = op === 'eq' ? '=' : op === 'neq' ? '!=' : op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : op === 'lte' ? '<=' : op.toUpperCase();
                            value = rest;
                            if (op === 'like' || op === 'ilike') value = `%${value}%`;
                        }
                    }
                }

                values.push(value);
                where.push(`${column} ${operator} $${values.length}`);
            }

            if (where.length > 0) {
                query += ` WHERE ` + where.join(' AND ');
            }

            if (filters.order) {
                const orderParts = filters.order.split('.');
                if (orderParts.length === 2) {
                    query += ` ORDER BY ${orderParts[0]} ${orderParts[1].toUpperCase()}`;
                } else {
                    query += ` ORDER BY ${filters.order}`;
                }
            }
            if (filters.limit) {
                query += ` LIMIT ${parseInt(filters.limit, 10)}`;
            }
            if (filters.offset) {
                query += ` OFFSET ${parseInt(filters.offset, 10)}`;
            }

            let data: any[] = await DataDatabase.getData(query, values);
            
            // Handle Joins
            if (select !== '*' && data.length > 0) {
                // regex to match table(cols) or table!inner(cols)
                const joinMatches = select.matchAll(/([\w!]+)\(([^)]+)\)/g);
                for (const match of joinMatches) {
                    let relatedTable = match[1];
                    const columns = match[2];
                    
                    const isInner = relatedTable.includes('!inner');
                    relatedTable = relatedTable.replace('!inner', '');
                    
                    let foreignKey = `${relatedTable.replace(/s$/, '').replace(/^pm_/, '')}_id`;
                    if (relatedTable === 'pm_equipment') foreignKey = 'equipment_id';
                    if (relatedTable === 'rooms') foreignKey = 'room_id';
                    if (relatedTable === 'buildings') foreignKey = 'building_id';
                    if (relatedTable === 'meal_orders') foreignKey = 'meal_order_id';
                    if (relatedTable === 'employees') foreignKey = 'employee_id';

                    const validCols = columns
                        .split(',')
                        .map(c => c.trim())
                        .filter(c => /^[a-zA-Z0-9_]+$/.test(c));
                    const selectCols = columns === '*' || validCols.length === 0 ? '*' : `id, ${validCols.join(', ')}`;

                    try {
                        const pool = Database.getPool();
                        if (foreignKey in data[0]) {
                            // Forward join: table_id -> relatedTable.id
                            const relatedIds = [...new Set(data.map(r => r[foreignKey]).filter(id => id))];
                            if (relatedIds.length > 0) {
                                const { rows: relatedData } = await pool.query(
                                    `SELECT ${selectCols} FROM "${relatedTable}" WHERE id = ANY($1)`,
                                    [relatedIds]
                                );
                                
                                // Support nested buildings join for rooms
                                if (relatedTable === 'rooms') {
                                    const bIds = [...new Set(relatedData.map(rd => rd.building_id).filter(Boolean))];
                                    if (bIds.length > 0) {
                                        const { rows: bRows } = await pool.query(
                                            `SELECT id, name FROM buildings WHERE id = ANY($1)`,
                                            [bIds]
                                        );
                                        const bMap = new Map(bRows.map(b => [b.id, b]));
                                        relatedData.forEach(rd => {
                                            rd.buildings = bMap.get(rd.building_id) || null;
                                        });
                                    }
                                }

                                const relatedMap = new Map(relatedData.map(r => [r.id, r]));
                                data.forEach(r => {
                                    r[relatedTable] = relatedMap.get(r[foreignKey]) || null;
                                });
                            }
                        } else {
                            // Reverse join: relatedTable.table_id -> table.id
                            const tableSingular = table.replace(/s$/, '');
                            const reverseFk = `${tableSingular}_id`;
                            const ids = data.map(r => r.id);
                            const selectColsRev = columns === '*' || validCols.length === 0 ? '*' : `${reverseFk}, ${validCols.join(', ')}`;
                            const { rows: relatedData } = await pool.query(
                                `SELECT ${selectColsRev} FROM "${relatedTable}" WHERE ${reverseFk} = ANY($1)`,
                                [ids]
                            );
                            // Group by parent id
                            const relatedMap = new Map<string, any[]>();
                            relatedData.forEach(rd => {
                                const parentId = rd[reverseFk];
                                if (!relatedMap.has(parentId)) relatedMap.set(parentId, []);
                                relatedMap.get(parentId)!.push(rd);
                            });
                            data.forEach(r => {
                                r[relatedTable] = relatedMap.get(r.id) || [];
                            });
                        }
                    } catch (joinErr: any) {
                        console.warn(`Join error for ${relatedTable}:`, joinErr.message);
                    }
                }
            }

            return data;
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createData(table: string, body: any, next: NextFunction) {
        if (!SAFE_TABLES.includes(table)) return next(createError({ status: 403, message: 'Unauthorized table' }));
        try {
            const keys = Object.keys(body);
            const values = Object.values(body);
            return await DataDatabase.createData(table, keys, values);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async updateData(table: string, id: string, updates: any, next: NextFunction) {
        if (!SAFE_TABLES.includes(table)) return next(createError({ status: 403, message: 'Unauthorized table' }));
        try {
            const keys = Object.keys(updates);
            const values = Object.values(updates);
            return await DataDatabase.updateData(table, id, keys, values);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async deleteData(table: string, id: string, next: NextFunction) {
        if (!SAFE_TABLES.includes(table)) return next(createError({ status: 403, message: 'Unauthorized table' }));
        try {
            return await DataDatabase.deleteData(table, id);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getDataById(table: string, id: string, next: NextFunction) {
        if (!SAFE_TABLES.includes(table)) return next(createError({ status: 403, message: 'Unauthorized table' }));
        try {
            const query = `SELECT * FROM ${table} WHERE id = $1`;
            const result = await DataDatabase.getData(query, [id]);
            if (!result || (Array.isArray(result) && result.length === 0)) {
                return next(createError({ status: 404, message: 'Record not found' }));
            }
            return Array.isArray(result) ? result[0] : result;
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async callRpc(fnName: string, params: any, next: NextFunction) {
        try {
            return await DataDatabase.callRpc(fnName, params);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default DataService;
