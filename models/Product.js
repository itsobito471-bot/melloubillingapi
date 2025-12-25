const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String },
    stock: { type: Number, default: 0 },
    description: String,
    image: String,
    isDeleted: { type: Boolean, default: false, index: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
