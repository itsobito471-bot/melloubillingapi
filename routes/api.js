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

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getMe);

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
router.get('/bills/:id/pdf', billingController.downloadBillPDF);

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

module.exports = router;
