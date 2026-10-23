import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import PermissionsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class PermissionsController {
    static async getUserRoles(req: Request, res: Response, next: NextFunction) {
        const result = await PermissionsService.getUserRoles(req.params.userId, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getRolePermissions(req: Request, res: Response, next: NextFunction) {
        const result = await PermissionsService.getRolePermissions(req.body.roles, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default PermissionsController;
