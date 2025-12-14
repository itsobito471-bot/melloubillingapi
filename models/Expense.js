const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExpenseCategory',
        required: true
    },
    description: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'],
        default: 'Cash'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', ExpenseSchema);
