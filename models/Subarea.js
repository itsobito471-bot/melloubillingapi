const mongoose = require('mongoose');

const SubareaSchema = new mongoose.Schema({
    name: { type: String, required: true },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area',
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure unique subarea names within an area
SubareaSchema.index({ name: 1, areaId: 1 }, { unique: true });

module.exports = mongoose.model('Subarea', SubareaSchema);
