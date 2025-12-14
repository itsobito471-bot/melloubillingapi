const Bill = require('../models/Bill');
const Product = require('../models/Product');

exports.createBill = async (req, res) => {
    const { clientId, items, discount } = req.body;

    try {
        let totalAmount = 0;
        const billItems = [];

        // Validate items and calculate total, check stock
        for (let item of items) {
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });
            if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

            // Decrement stock
            product.stock -= item.quantity;
            await product.save();

            const amount = product.price * item.quantity;
            totalAmount += amount;

            billItems.push({
                product: product._id,
                name: product.name, // Store name in case it changes later
                quantity: item.quantity,
                price: product.price
            });
        }

        const finalAmount = totalAmount - (discount || 0);

        const bill = new Bill({
            client: clientId,
            items: billItems,
            totalAmount,
            discount,
            finalAmount
        });

        await bill.save();
        res.status(201).json(bill);

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getBills = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Bill.countDocuments();
        const bills = await Bill.find()
            .populate('client')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: bills,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
