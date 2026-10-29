import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import CampsDatabase from './database';

class CampsService {
    static async getAllCamps(next: NextFunction) {
        try {
            return await CampsDatabase.getAllCamps();
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getCampById(id: string, next: NextFunction) {
        try {
            const camp = await CampsDatabase.getCampById(id);
            if (!camp) return next(createError({ status: 404, message: 'Not found' }));
            return camp;
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getBuildings(campId: string, next: NextFunction) {
        try {
            return await CampsDatabase.getBuildings(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getRooms(campId: string, next: NextFunction) {
        try {
            return await CampsDatabase.getRooms(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createCamp(data: any, next: NextFunction) {
        const { name, location, total_capacity } = data;
        try {
            return await CampsDatabase.createCamp(name, location, total_capacity);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createBuilding(campId: string, data: any, next: NextFunction) {
        const { name } = data;
        try {
            return await CampsDatabase.createBuilding(name, campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async createRoom(campId: string, data: any, next: NextFunction) {
        const { room_number, capacity, building_id } = data;
        try {
            return await CampsDatabase.createRoom(room_number, capacity, building_id, campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getInmates(campId: string, next: NextFunction) {
        try {
            return await CampsDatabase.getInmates(campId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async deleteCamp(id: string, forceArchive: boolean, next: NextFunction) {
        try {
            const result: any = await CampsDatabase.deleteCamp(id, forceArchive);
            if (result.notFound) {
                return next(createError({ status: 404, message: 'Camp not found' }));
            }
            if (result.blocked) {
                return next(createError({ status: 400, message: result.message }));
            }
            if (result.hasHistory) {
                return next(createError({ status: 409, message: result.message }));
            }
            return result;
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default CampsService;
