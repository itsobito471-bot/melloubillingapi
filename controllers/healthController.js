

exports.getHealth = async (req, res) => {
    try {
        res.json({ message: 'OK' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
