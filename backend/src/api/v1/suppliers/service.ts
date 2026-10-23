import SuppliersDatabase from './database';

class SuppliersService {
    static async getAllSuppliers() {
        return await SuppliersDatabase.getAllSuppliers();
    }

    static async getSupplierById(id: string) {
        return await SuppliersDatabase.getSupplierById(id);
    }

    static async createSupplier(supplier: any, roomRates: any[]) {
        return await SuppliersDatabase.createSupplier(supplier, roomRates);
    }

    static async updateSupplier(id: string, supplier: any, roomRates?: any[]) {
        return await SuppliersDatabase.updateSupplier(id, supplier, roomRates);
    }

    static async deleteSupplier(id: string) {
        return await SuppliersDatabase.deleteSupplier(id);
    }
}

export default SuppliersService;
