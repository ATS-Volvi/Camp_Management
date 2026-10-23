import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import CookRequestsService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class CookRequestsController {
    static async getCookRequests(req: Request, res: Response, next: NextFunction) {
        const result = await CookRequestsService.getCookRequests(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getCookRequestItems(req: Request, res: Response, next: NextFunction) {
        const result = await CookRequestsService.getCookRequestItems(req.query.request_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createCookRequest(req: Request, res: Response, next: NextFunction) {
        const result = await CookRequestsService.createCookRequest(req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async issueCookRequest(req: Request, res: Response, next: NextFunction) {
        const result = await CookRequestsService.issueCookRequest(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default CookRequestsController;
