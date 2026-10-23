import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import EmployeesService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class EmployeesController {
    static async getAllEmployees(req: Request, res: Response, next: NextFunction) {
        const result = await EmployeesService.getAllEmployees(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getEmployeeById(req: Request, res: Response, next: NextFunction) {
        const result = await EmployeesService.getEmployeeById(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createEmployees(req: Request, res: Response, next: NextFunction) {
        const result = await EmployeesService.createEmployees(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async updateEmployee(req: Request, res: Response, next: NextFunction) {
        const result = await EmployeesService.updateEmployee(req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createStaffLogin(req: Request, res: Response, next: NextFunction) {
        const result = await EmployeesService.createStaffLogin(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async changePresenceStatus(req: Request, res: Response, next: NextFunction) {
        const userId = (req as any).user?.id || req.body.changedBy || null;
        const result = await EmployeesService.changePresenceStatus(req.params.id, { ...req.body, changedBy: userId }, next);
        if (result) {
            res.status(StatusCodes.OK).json({ success: true, logId: result });
        }
    }
}

export default EmployeesController;
