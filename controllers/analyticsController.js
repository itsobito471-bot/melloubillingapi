const Bill = require('../models/Bill');
const Product = require('../models/Product');

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

        // Simple recent bills
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
