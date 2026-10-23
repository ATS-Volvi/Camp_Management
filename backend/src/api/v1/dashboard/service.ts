import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import DashboardDatabase from './database';

class DashboardService {
    static async getRecentTickets(next: NextFunction) {
        try {
            return await DashboardDatabase.getRecentTickets();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCheckIns(next: NextFunction) {
        try {
            return await DashboardDatabase.getCheckIns();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCheckOuts(next: NextFunction) {
        try {
            return await DashboardDatabase.getCheckOuts();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getSystemAlerts(next: NextFunction) {
        try {
            return await DashboardDatabase.getSystemAlerts();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getDrilldown(type: string, next: NextFunction) {
        try {
            let query = '';
            switch (type) {
                case 'camps':
                    query = `
                        SELECT c.id, c.name, c.location, c.camp_code, c.status, c.camp_type,
                               (SELECT json_agg(json_build_object('id', r.id, 'max_capacity', r.max_capacity, 'current_occupancy', r.current_occupancy)) FROM rooms r WHERE r.camp_id = c.id) as rooms
                        FROM camps c
                        ORDER BY c.name
                    `;
                    break;
                case 'rooms':
                case 'capacity':
                    query = `
                        SELECT c.id, c.name, c.location,
                               (SELECT json_agg(json_build_object(
                                   'id', r.id, 'room_number', r.room_number, 'status', r.status, 
                                   'max_capacity', r.max_capacity, 'current_occupancy', r.current_occupancy, 
                                   'floor', r.floor, 'ac', r.ac, 'category', r.category,
                                   'building_id', r.building_id,
                                   'buildings', (SELECT json_build_object('id', b.id, 'name', b.name) FROM buildings b WHERE b.id = r.building_id)
                               )) FROM rooms r WHERE r.camp_id = c.id) as rooms
                        FROM camps c
                        ORDER BY c.name
                    `;
                    break;
                case 'maintenance':
                    query = `
                        SELECT r.id, r.room_number, r.status, r.max_capacity, r.camp_id,
                               json_build_object('name', c.name) as camps,
                               json_build_object('name', b.name) as buildings
                        FROM rooms r
                        LEFT JOIN camps c ON r.camp_id = c.id
                        LEFT JOIN buildings b ON r.building_id = b.id
                        WHERE r.status = 'under_maintenance'
                        ORDER BY r.room_number
                    `;
                    break;
                case 'reserved':
                    query = `
                        SELECT r.id, r.room_number, r.status, r.max_capacity, r.current_occupancy, r.category, r.camp_id,
                               json_build_object('name', c.name) as camps,
                               json_build_object('name', b.name) as buildings
                        FROM rooms r
                        LEFT JOIN camps c ON r.camp_id = c.id
                        LEFT JOIN buildings b ON r.building_id = b.id
                        WHERE r.status = 'reserved'
                        ORDER BY r.room_number
                    `;
                    break;
                default:
                    return next(createError({ status: 400, message: 'Invalid drilldown type' }));
            }
            return await DashboardDatabase.getDrilldown(query);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default DashboardService;
