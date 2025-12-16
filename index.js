const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
app.use('/uploads', express.static('uploads'));


//setup for production

const https = require('https');

const url = 'https://mellou-billing.onrender.com/api/health';

setInterval(() => {
    https.get(url, (res) => {
        console.log(`Ping sent to ${url}. Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(`Ping failed: ${e.message}`);
    });
}, 14 * 60 * 1000);

//--------------------------------------------------

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('Mellou Billing API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
