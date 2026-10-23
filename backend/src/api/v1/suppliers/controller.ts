import type { Request, Response, NextFunction } from 'express';
import SuppliersService from './service';

class SuppliersController {
    static async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
        try {
            const suppliers = await SuppliersService.getAllSuppliers();
            res.json(suppliers);
        } catch (error) {
            next(error);
        }
    }

    static async getSupplierById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const supplier = await SuppliersService.getSupplierById(id);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
            res.json(supplier);
        } catch (error) {
            next(error);
        }
    }

    static async createSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { roomRates = [], ...supplierData } = req.body;
            const created = await SuppliersService.createSupplier(supplierData, roomRates);
            res.status(201).json(created);
        } catch (error) {
            next(error);
        }
    }

    static async updateSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { roomRates, ...supplierData } = req.body;
            const updated = await SuppliersService.updateSupplier(id, supplierData, roomRates);
            res.json(updated);
        } catch (error) {
            next(error);
        }
    }

    static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await SuppliersService.deleteSupplier(id);
            res.json({ success: true, message: 'Supplier deleted successfully' });
        } catch (error) {
            next(error);
        }
    }
}

export default SuppliersController;
