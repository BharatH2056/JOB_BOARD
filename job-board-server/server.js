'use strict';

/**
 * server.js — Entry point for the job-board-server Express application.
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Connect to MongoDB Atlas via Mongoose
 *  3. Configure Express (JSON parsing, CORS, routes)
 *  4. Start the HTTP server
 */

// ─── 1. Environment variables ──────────────────────────────────────────────
require('dotenv').config();

const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');
const routes     = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── 2. Connect to MongoDB ─────────────────────────────────────────────────
connectDB();

// ─── 3. Global middleware ──────────────────────────────────────────────────
app.use(cors());                          // Enable CORS for all origins
app.use(express.json()); 
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});                 // Parse incoming JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── 4. Health check (root-level, no /api prefix) ─────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── 5. API routes ─────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── 6. 404 handler ────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── 7. Global error handler ───────────────────────────────────────────────
app.use(errorHandler);

const { startDigestCronJob } = require('./services/digest.service');

// ─── 8. Start server ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 job-board-server running on port ${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/health`);

  if (process.env.NODE_ENV !== 'test') {
    startDigestCronJob();
  }
});

module.exports = app; // exported for testing
