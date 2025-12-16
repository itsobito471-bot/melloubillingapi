const Setting = require('../models/Setting');

// Get all settings or a specific setting by key
exports.getSettings = async (req, res) => {
    try {
        const { key } = req.query;
        if (key) {
            const setting = await Setting.findOne({ key });
            return res.json(setting ? setting.value : null);
        }
        const settings = await Setting.find({});
        // Convert to key-value object for easier frontend consumption
        const settingsMap = {};
        settings.forEach(s => settingsMap[s.key] = s.value);
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update or create a setting
exports.updateSetting = async (req, res) => {
    try {
        const { key, value, description } = req.body;

        // Handle bulk update if body is an object of key-values but not {key, value} structure
        // But for simplicity, let's assume one by one or standard structure.
        // If the user wants to update multiple at once, we can handle that.

        // Let's support bulk update if body is array or object without 'key' property
        if (!key && typeof req.body === 'object') {
            const updates = [];
            for (const [k, v] of Object.entries(req.body)) {
                updates.push(Setting.findOneAndUpdate(
                    { key: k },
                    { value: v },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                ));
            }
            await Promise.all(updates);
            return res.json({ message: 'Settings updated successfully' });
        }

        const setting = await Setting.findOneAndUpdate(
            { key },
            { value, description },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
