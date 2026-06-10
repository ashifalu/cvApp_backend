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

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

// ← "(.*)": path-to-regexp v8+ no longer accepts bare "*"
server.use(cors(corsOptions));

server.use('/uploads', express.static(path.join(__dirname, 'uploads')));
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Add this — handles preflight before routes

// ─── Routes ───────────────────────────────────────────────────────────────────
server.use(routes);

// ─── Static files ─────────────────────────────────────────────────────────────
server.use('/images', express.static('public/images'));

// ─── DB ───────────────────────────────────────────────────────────────────────
require('./connection');

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
