const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Expense = require('../models/Expense');

exports.getAnalytics = async (req, res) => {
    try {
        const totalSales = await Bill.aggregate([
            { $group: { _id: null, total: { $sum: "$finalAmount" } } }
        ]);

        const salesByDate = await Bill.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    total: { $sum: "$finalAmount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const recentBills = await Bill.find().sort({ date: -1 }).limit(5).populate('client');

        res.json({
            totalRevenue: totalSales[0] ? totalSales[0].total : 0,
            salesByDate,
            recentBills
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateMatch = {};
        if (startDate && endDate) {
            dateMatch.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // 1. Total Income (Bills)
        const incomeAgg = await Bill.aggregate([
            { $match: dateMatch },
            { $group: { _id: null, total: { $sum: "$finalAmount" } } }
        ]);
        const totalIncome = incomeAgg[0]?.total || 0;

        // 2. Total Expenses
        const expenseAgg = await Expense.aggregate([
            { $match: dateMatch },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalExpenses = expenseAgg[0]?.total || 0;

        // 3. Sales Trend (Daily)
        const salesTrend = await Bill.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    sales: { $sum: "$finalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Regional Sales (By Area)
        const regionalSales = await Bill.aggregate([
            { $match: dateMatch },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'client',
                    foreignField: '_id',
                    as: 'clientDetails'
                }
            },
            { $unwind: '$clientDetails' },
            {
                $group: {
                    _id: '$clientDetails.area',
                    total: { $sum: "$finalAmount" }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // 5. Route Sales (By Subarea)
        const routeSales = await Bill.aggregate([
            { $match: dateMatch },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'client',
                    foreignField: '_id',
                    as: 'clientDetails'
                }
            },
            { $unwind: '$clientDetails' },
            {
                $group: {
                    _id: '$clientDetails.subarea',
                    total: { $sum: "$finalAmount" }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        // 6. Retail Sales (By Client)
        const retailSales = await Bill.aggregate([
            { $match: dateMatch },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'client',
                    foreignField: '_id',
                    as: 'clientDetails'
                }
            },
            { $unwind: '$clientDetails' },
            {
                $group: {
                    _id: '$clientDetails.name',
                    total: { $sum: "$finalAmount" }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            summary: {
                income: totalIncome,
                expenses: totalExpenses,
                netIncome: totalIncome - totalExpenses
            },
            salesTrend,
            regionalSales,
            routeSales,
            retailSales
        });

    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ message: err.message });
    }
};
