require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// create server
const server = express();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// middleware
server.use(cors());
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Increase limit for large HTML
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true }));

// routes
server.use(routes);

// static files
server.use('/images', express.static('public/images'));

// DB connection
require('./connection');

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server running successfully at ${PORT}`);
});