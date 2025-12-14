const Client = require('../models/Client');

exports.getClients = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Client.countDocuments();
        const clients = await Client.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: clients,
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

exports.addClient = async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        res.status(201).json(client);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Client code must be unique' });
        }
        res.status(400).json({ message: err.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Client code must be unique' });
        }
        res.status(400).json({ message: err.message });
    }
};
