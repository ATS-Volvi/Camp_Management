import FoodCancellationDatabase from './database';

class FoodCancellationService {
    static async getRequests(filters: { campId?: string; status?: string }) {
        return await FoodCancellationDatabase.getRequests(filters);
    }

    static async submitCancellation(params: any) {
        return await FoodCancellationDatabase.submitCancellation(params);
    }

    static async approveCancellation(requestId: string, approverId: string | null) {
        return await FoodCancellationDatabase.approveCancellation(requestId, approverId);
    }

    static async rejectCancellation(requestId: string, approverId: string | null, reason: string) {
        return await FoodCancellationDatabase.rejectCancellation(requestId, approverId, reason);
    }

    static async getKitchenMealCount(campId: string, date: string) {
        return await FoodCancellationDatabase.getKitchenMealCount(campId, date);
    }

    static async getSettings(campId: string) {
        return await FoodCancellationDatabase.getSettings(campId);
    }

    static async upsertSettings(settings: any) {
        return await FoodCancellationDatabase.upsertSettings(settings);
    }
}

export default FoodCancellationService;
