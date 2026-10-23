import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import AuthService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class AuthController {
    static async signup(req: Request, res: Response, next: NextFunction) {
        const result = await AuthService.signup(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json({
                content: result,
                status: true
            });
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        const result = await AuthService.login(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json({
                content: result,
                status: true
            });
        }
    }

    static async getMe(req: Request, res: Response, next: NextFunction) {
        const result = await AuthService.getMe(req.headers.authorization, next);
        if (result) {
            res.status(StatusCodes.OK).json({
                content: result,
                status: true
            });
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        res.status(StatusCodes.OK).json({
            message: 'Logged out',
            status: true
        });
    }

    static async changePassword(req: Request, res: Response, next: NextFunction) {
        const result = await AuthService.changePassword(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json({
                content: result,
                status: true
            });
        }
    }
}

export default AuthController;
