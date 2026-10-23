import type { Request, Response, NextFunction } from 'express';
import FoodCancellationService from './service';

class FoodCancellationController {
    static async getRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const { campId, status } = req.query;
            const requests = await FoodCancellationService.getRequests({
                campId: campId as string,
                status: status as string
            });
            res.json(requests);
        } catch (error) {
            next(error);
        }
    }

    static async submitCancellation(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id || req.body.submitted_by || null;
            const result = await FoodCancellationService.submitCancellation({
                ...req.body,
                submitted_by: userId
            });
            res.status(201).json({ id: result, success: true });
        } catch (error) {
            next(error);
        }
    }

    static async approveCancellation(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const approverId = (req as any).user?.id || req.body.approver_id || null;
            await FoodCancellationService.approveCancellation(id, approverId);
            res.json({ success: true, message: 'Request approved successfully' });
        } catch (error) {
            next(error);
        }
    }

    static async rejectCancellation(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const approverId = (req as any).user?.id || req.body.approver_id || null;
            await FoodCancellationService.rejectCancellation(id, approverId, reason || 'Rejected by administrator');
            res.json({ success: true, message: 'Request rejected' });
        } catch (error) {
            next(error);
        }
    }

    static async getKitchenMealCount(req: Request, res: Response, next: NextFunction) {
        try {
            const { campId } = req.params;
            const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
            const counts = await FoodCancellationService.getKitchenMealCount(campId, date);
            res.json(counts);
        } catch (error) {
            next(error);
        }
    }

    static async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const { campId } = req.params;
            const settings = await FoodCancellationService.getSettings(campId);
            res.json(settings);
        } catch (error) {
            next(error);
        }
    }

    static async upsertSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await FoodCancellationService.upsertSettings(req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

export default FoodCancellationController;
