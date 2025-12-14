const mongoose = require('mongoose');

const AreaSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    subareas: [{ type: String }]
});

module.exports = mongoose.model('Area', AreaSchema);
