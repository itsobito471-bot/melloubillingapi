const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { _id: { $ne: req.userId } }; // Filter out current user

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            users,
            total,
            page,
            limit
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const lowercaseEmail = email.toLowerCase();
        const lowercaseUsername = username.toLowerCase();

        const existingUser = await User.findOne({ $or: [{ email: lowercaseEmail }, { username: lowercaseUsername }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = new User({ username, email, password, role });
        await user.save();

        res.status(201).json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent self-revocation (optional but recommended)
        if (user._id.toString() === req.userId) {
            return res.status(400).json({ message: 'Cannot revoke your own access' });
        }

        user.status = user.status === 'active' ? 'revoked' : 'active';
        await user.save();

        res.json({ message: `User access ${user.status}`, status: user.status });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
