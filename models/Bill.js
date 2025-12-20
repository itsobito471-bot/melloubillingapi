const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    billNumber: { type: String, unique: true, required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        name: String
    }],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', BillSchema);
