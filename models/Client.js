const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    area: { type: String },
    subarea: { type: String },
    address: String,
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Client', ClientSchema);
