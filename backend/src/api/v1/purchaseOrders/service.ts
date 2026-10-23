import type { NextFunction } from 'express';
import { createError } from '../../../../utils/errors/createError';
import PurchaseOrdersDatabase from './database';

class PurchaseOrdersService {
    static async getPurchaseOrders(filters: any, next: NextFunction) {
        try {
            return await PurchaseOrdersDatabase.getPurchaseOrders(filters);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async getPurchaseOrderItems(poId: string, next: NextFunction) {
        try {
            return await PurchaseOrdersDatabase.getPurchaseOrderItems(poId);
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }

    static async receivePurchaseOrder(data: any, next: NextFunction) {
        try {
            await PurchaseOrdersDatabase.receivePurchaseOrderTransaction(data);
            return { message: 'Items received and stock updated' };
        } catch (err: any) {
            return next(createError({ status: 500, message: err.message }));
        }
    }
}

export default PurchaseOrdersService;
