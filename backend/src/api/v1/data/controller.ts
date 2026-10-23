import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import DataService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class DataController {
    static async getData(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.getData(req.params.table, req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async createData(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.createData(req.params.table, req.body, next);
        if (result) {
            res.status(StatusCodes.CREATED).json(result);
        }
    }

    static async updateData(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.updateData(req.params.table, req.params.id, req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async deleteData(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.deleteData(req.params.table, req.params.id, next);
        if (result) {
            res.status(StatusCodes.NO_CONTENT).send();
        }
    }

    static async getDataById(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.getDataById(req.params.table, req.params.id, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async callRpc(req: Request, res: Response, next: NextFunction) {
        const result = await DataService.callRpc(req.params.fn, req.body, next);
        res.status(StatusCodes.OK).json({ data: result, error: null });
    }
}

export default DataController;
