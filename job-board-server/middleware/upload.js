'use strict';

/**
 * middleware/upload.js
 * ────────────────────
 * Multer middleware for handling resume file uploads stored on disk.
 */

const fs     = require('fs');
const path   = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../uploads/resumes');

// Ensure destination directory exists on disk
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniquePrefix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const uploadPdfOnly = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

upload.uploadPdfOnly = uploadPdfOnly;

module.exports = upload;
module.exports.uploadPdfOnly = uploadPdfOnly;
