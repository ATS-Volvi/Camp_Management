import express from 'express';
import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import Database from './config/dbConn';
import logger from './utils/logger';
import { createError } from './utils/errors/createError';
import { variables } from './config/envLoader';

// Refactored Routes
import AuthRouter from './src/api/v1/auth/routes';
import CampsRouter from './src/api/v1/camps/routes';
import EmployeesRouter from './src/api/v1/employees/routes';
import VisitorsRouter from './src/api/v1/visitors/routes';
import PermissionsRouter from './src/api/v1/permissions/routes';
import AssetsRouter from './src/api/v1/assets/routes';
import CheckInOutRouter from './src/api/v1/checkinout/routes';
import CateringRouter from './src/api/v1/catering/routes';
import MenuDishesRouter from './src/api/v1/menuDishes/routes';
import CookRequestsRouter from './src/api/v1/cookRequests/routes';
import PurchaseOrdersRouter from './src/api/v1/purchaseOrders/routes';
import FoodSafetyRouter from './src/api/v1/foodSafety/routes';
import FinancialsRouter from './src/api/v1/financials/routes';
import MaintenanceRouter from './src/api/v1/maintenance/routes';
import AdminRouter from './src/api/v1/admin/routes';
import DashboardRouter from './src/api/v1/dashboard/routes';
import DataRouter from './src/api/v1/data/routes';
import AttendanceRouter from './src/api/v1/attendance/routes';
import RoomChangesRouter from './src/api/v1/roomChanges/routes';
import CampTransfersRouter from './src/api/v1/campTransfers/routes';
import ActivitiesRouter from './src/api/v1/activities/routes';
import AIRouter from './src/api/v1/ai/routes';
import GroceryInventoryRouter from './src/api/v1/groceryInventory/routes';
import FoodCancellationRouter from './src/api/v1/foodCancellation/routes';
import SuppliersRouter from './src/api/v1/suppliers/routes';

class Server {
    public app = express();
    public port?: number;

    constructor() {
        this.config();
        this.router();
    }

    private async connectToDb() {
        return await Database.createConnection();
    }

    public config() {
        this.app.set('trust proxy', true);
        this.app.set('case sensitive routing', true);
        
        const corsOptions = {
            origin: variables.CORS_ALLOW_ORIGIN || '*',
            methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
        };
        
        this.app.use(cors(corsOptions));
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.url}`);
            next();
        });
    }

    public router() {
        // API v1 Routes
        this.app.use('/api/auth', AuthRouter);
        this.app.use('/api/camps', CampsRouter);
        this.app.use('/api/employees', EmployeesRouter);
        this.app.use('/api/visitors', VisitorsRouter);
        this.app.use('/api/permissions', PermissionsRouter);
        this.app.use('/api/assets', AssetsRouter);
        this.app.use('/api/checkinout', CheckInOutRouter);
        this.app.use('/api/catering', CateringRouter);
        this.app.use('/api/menu-dishes', MenuDishesRouter);
        this.app.use('/api/cook-requests', CookRequestsRouter);
        this.app.use('/api/purchase-orders', PurchaseOrdersRouter);
        this.app.use('/api/food-safety', FoodSafetyRouter);
        this.app.use('/api/financials', FinancialsRouter);
        this.app.use('/api/maintenance', MaintenanceRouter);
        this.app.use('/api/admin', AdminRouter);
        this.app.use('/api/dashboard', DashboardRouter);
        this.app.use('/api/data', DataRouter);
        this.app.use('/api/attendance', AttendanceRouter);
        this.app.use('/api/room-changes', RoomChangesRouter);
        this.app.use('/api/camp-transfers', CampTransfersRouter);
        this.app.use('/api/activities', ActivitiesRouter);
        this.app.use('/api/ai', AIRouter);
        this.app.use('/api/grocery-inventory', GroceryInventoryRouter);
        this.app.use('/api/food-cancellation', FoodCancellationRouter);
        this.app.use('/api/suppliers', SuppliersRouter);

        // Health check
        this.app.get(['/', '/health', '/api/health'], (_req, res) => {
            res.status(200).json({ status: 'ok', service: 'camp-management-backend', timestamp: new Date().toISOString() });
        });

        // 404 Handler
        this.app.use((req, res, next) => {
            next(createError({ status: 404, message: 'Not Found' }));
        });

        // Error Middleware
        const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
            const errorStatus = err.status || 500;
            const errorMessage = err.message || 'Something went wrong';
            
            logger.error(err);
            
            res.status(errorStatus).json({
                status: errorStatus,
                message: errorMessage,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
                success: false
            });
        };
        this.app.use(errorMiddleware);
    }

    public async start(port: number) {
        await this.connectToDb();
        this.port = port;
        const server = this.app.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
        return server;
    }
}

export default Server;
