import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import ActivitiesService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class ActivitiesController {
    static async getAllFeeds(req: Request, res: Response, next: NextFunction) {
        const result = await ActivitiesService.getAllFeeds(next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default ActivitiesController;
