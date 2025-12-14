const Area = require('../models/Area');

exports.getAreas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // Higher limit for areas
        const skip = (page - 1) * limit;

        const total = await Area.countDocuments();
        const areas = await Area.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: areas,
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

exports.addArea = async (req, res) => {
    try {
        const area = new Area(req.body);
        await area.save();
        res.status(201).json(area);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.addSubarea = async (req, res) => {
    const { areaId, subareaName } = req.body;
    try {
        const area = await Area.findById(areaId);
        if (!area) return res.status(404).json({ message: 'Area not found' });

        area.subareas.push(subareaName);
        await area.save();
        res.json(area);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
