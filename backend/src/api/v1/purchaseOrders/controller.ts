import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import PurchaseOrdersService from './service';
import StatusCodes from '../../../../config/constants/statusCodes';

class PurchaseOrdersController {
    static async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
        const result = await PurchaseOrdersService.getPurchaseOrders(req.query, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async getPurchaseOrderItems(req: Request, res: Response, next: NextFunction) {
        const result = await PurchaseOrdersService.getPurchaseOrderItems(req.query.po_id as string, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }

    static async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
        const result = await PurchaseOrdersService.receivePurchaseOrder(req.body, next);
        if (result) {
            res.status(StatusCodes.OK).json(result);
        }
    }
}

export default PurchaseOrdersController;
