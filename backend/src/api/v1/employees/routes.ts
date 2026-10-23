import express from 'express';
import EmployeesController from './controller';

const router = express.Router();

router.get('/', EmployeesController.getAllEmployees);
router.get('/:id', EmployeesController.getEmployeeById);
router.post('/', EmployeesController.createEmployees);
router.put('/:id', EmployeesController.updateEmployee);
router.put('/:id/status', EmployeesController.changePresenceStatus);
router.post('/create-staff-login', EmployeesController.createStaffLogin);

export default router;
