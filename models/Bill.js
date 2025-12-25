const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    billNumber: { type: String, unique: true, required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        mrp: { type: Number, required: true }, // Original product price
        price: { type: Number, required: true }, // Adjusted price (Inclusive of GST)
        basePrice: { type: Number, default: 0 }, // Excluding GST
        taxAmount: { type: Number, default: 0 }, // GST amount
        name: String
    }],
    totalAmount: { type: Number, required: true }, // Sum of AdjustedPrice * Quantity
    discount: { type: Number, default: 0 },
    resellerMargin: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
});

module.exports = mongoose.model('Bill', BillSchema);
