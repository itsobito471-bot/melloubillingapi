const Area = require('../models/Area');
const Subarea = require('../models/Subarea');

// Get all areas
exports.getAreas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const total = await Area.countDocuments();
        const areas = await Area.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get subarea count for each area
        const areasWithCount = await Promise.all(
            areas.map(async (area) => {
                const subareaCount = await Subarea.countDocuments({ areaId: area._id });
                return {
                    ...area.toObject(),
                    subareaCount
                };
            })
        );

        res.json({
            data: areasWithCount,
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

// Add new area
exports.addArea = async (req, res) => {
    try {
        const area = new Area(req.body);
        await area.save();
        res.status(201).json(area);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Get all subareas
exports.getSubareas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        const areaId = req.query.areaId; // Optional filter by area

        const query = areaId ? { areaId } : {};

        const total = await Subarea.countDocuments(query);
        const subareas = await Subarea.find(query)
            .populate('areaId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Transform to include area name directly
        const transformedSubareas = subareas.map(subarea => ({
            _id: subarea._id,
            name: subarea.name,
            areaId: subarea.areaId._id,
            areaName: subarea.areaId.name,
            createdAt: subarea.createdAt,
            updatedAt: subarea.updatedAt
        }));

        res.json({
            data: transformedSubareas,
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

// Add new subarea
exports.addSubarea = async (req, res) => {
    const { areaId, name } = req.body;
    try {
        // Verify area exists
        const area = await Area.findById(areaId);
        if (!area) {
            return res.status(404).json({ message: 'Area not found' });
        }

        // Create subarea
        const subarea = new Subarea({ name, areaId });
        await subarea.save();

        // Populate area name for response
        await subarea.populate('areaId', 'name');

        res.status(201).json({
            _id: subarea._id,
            name: subarea.name,
            areaId: subarea.areaId._id,
            areaName: subarea.areaId.name,
            createdAt: subarea.createdAt,
            updatedAt: subarea.updatedAt
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Subarea already exists in this area' });
        }
        res.status(400).json({ message: err.message });
    }
};
