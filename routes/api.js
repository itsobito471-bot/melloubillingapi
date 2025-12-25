const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const inventoryController = require('../controllers/inventoryController');
const billingController = require('../controllers/billingController');
const clientController = require('../controllers/clientController');
const areaController = require('../controllers/areaController');
const analyticsController = require('../controllers/analyticsController');
const authController = require('../controllers/authController');
const expenseController = require('../controllers/expenseController');
const healthController = require('../controllers/healthController');

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getMe);
router.post('/auth/change-password', authMiddleware, authController.changePassword);

// Notifications
const notificationController = require('../controllers/notificationController');
router.get('/notifications', authMiddleware, notificationController.getNotifications);
router.patch('/notifications/:id/read', authMiddleware, notificationController.markAsRead);
router.post('/notifications/read-all', authMiddleware, notificationController.markAllAsRead);

// Protected routes
router.use(authMiddleware);

// Inventory
router.get('/products', inventoryController.getProducts);
router.post('/products', inventoryController.addProduct);
router.patch('/products/:id', inventoryController.updateProduct);
router.delete('/products/:id', inventoryController.deleteProduct);

// Clients
router.get('/clients', clientController.getClients);
router.post('/clients', clientController.addClient);
router.patch('/clients/:id', clientController.updateClient);

// Billing
router.post('/bills', billingController.createBill);
router.get('/bills', billingController.getBills);
router.get('/bills/:id', billingController.getBillById);
router.patch('/bills/:id', billingController.updateBill);
router.get('/bills/:id/pdf', billingController.downloadBillPDF);
router.delete('/bills/:id', billingController.deleteBill);

// Areas
router.get('/areas', areaController.getAreas);
router.post('/areas', areaController.addArea);

// Subareas
router.get('/subareas', areaController.getSubareas);
router.post('/subareas', areaController.addSubarea);

// Expenses - Categories
router.get('/expenses/categories', expenseController.getCategories);
router.post('/expenses/categories', expenseController.addCategory);
router.patch('/expenses/categories/:id', expenseController.updateCategory);
router.delete('/expenses/categories/:id', expenseController.deleteCategory);

const upload = require('../middleware/upload');

// ... imports ...

// Expenses - Items
router.get('/expenses', expenseController.getExpenses);
router.get('/expenses/:id', expenseController.getExpenseById);
router.post('/expenses', upload.single('receipt'), expenseController.addExpense);
router.patch('/expenses/:id', upload.single('receipt'), expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);

// Analytics
router.get('/analytics', analyticsController.getAnalytics);
router.get('/dashboard/stats', analyticsController.getDashboardStats);

// Settings
const settingController = require('../controllers/settingController');
router.get('/settings', settingController.getSettings);
router.post('/settings', settingController.updateSetting);


// Health
router.get('/health', healthController.getHealth);

// User Management (Admin only)
const userController = require('../controllers/userController');
const adminCheck = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Requires admin role' });
    }
    next();
};

router.get('/users', adminCheck, userController.getAllUsers);
router.post('/users', adminCheck, userController.createUser);
router.patch('/users/:id/status', adminCheck, userController.toggleUserStatus);

module.exports = router;
