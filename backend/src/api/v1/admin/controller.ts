import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import AdminService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class AdminController {
    static async getAllUsers(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.getAllUsers(next);
        if (result) {
            res.status(StatusCodes.OK).json({ users: result });
        }
    }

    static async createUser(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.createUser(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.updateUserStatus(req.params.id, req.body.is_disabled, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async updateUserRole(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.updateUserRole(req.params.id, req.body.new_role, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async resetUserPassword(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.resetUserPassword(req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
        const result = await AdminService.getAuditLogs(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default AdminController;
