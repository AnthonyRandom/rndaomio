const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compressImage } = require('../compression/imageCompressor');
const { compressGif } = require('../compression/gifCompressor');
const { compressVideo } = require('../compression/videoCompressor');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2000 * 1024 * 1024 }, // 2GB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/tiff',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only images and videos are accepted.`), false);
    }
  }
});

router.post('/compress', upload.single('file'), async (req, res) => {
  const tmpFilePath = path.join(__dirname, '../tmp', `temp-${Date.now()}`);
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { targetSizeBytes } = req.body;
    const targetSize = parseInt(targetSizeBytes);
    const originalSize = req.file.buffer.length;
    const mimetype = req.file.mimetype;

    console.log(`[Server] Processing: ${req.file.originalname} (${originalSize} bytes, target: ${targetSize} bytes)`);

    // Write buffer to temporary file for compression
    fs.writeFileSync(tmpFilePath, req.file.buffer);
    
    // Route to appropriate compressor based on file type
    let result;
    if (mimetype === 'image/gif') {
      result = await compressGif(tmpFilePath, targetSize);
    } else if (mimetype.startsWith('video/')) {
      result = await compressVideo(tmpFilePath, targetSize);
    } else {
      result = await compressImage(tmpFilePath, targetSize, mimetype);
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname}"`);
    res.setHeader('X-Original-Size', result.originalSize.toString());
    res.setHeader('X-Compressed-Size', result.compressedSize.toString());
    res.setHeader('X-Was-Compressed', result.wasCompressed.toString());
    
    if (result.quality) {
      res.setHeader('X-Quality', result.quality.toString());
    }
    
    if (result.lossyLevel) {
      res.setHeader('X-Lossy-Level', result.lossyLevel.toString());
    }
    
    if (result.colors) {
      res.setHeader('X-Colors', result.colors.toString());
    }

    if (result.bitrate) {
      res.setHeader('X-Bitrate', result.bitrate.toString());
    }

    if (result.audioMuted !== undefined) {
      res.setHeader('X-Audio-Muted', result.audioMuted.toString());
    }

    res.send(result.buffer);

    // Cleanup temp file
    setTimeout(() => {
      try {
        if (fs.existsSync(tmpFilePath)) {
          fs.unlinkSync(tmpFilePath);
        }
      } catch (err) {
        console.warn('[Server] Cleanup failed:', err.message);
      }
    }, 1000);

  } catch (error) {
    console.error('[Server] Error:', error);

    // Cleanup on error
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (err) {
      console.warn('[Server] Cleanup failed:', err.message);
    }

    res.status(500).json({
      error: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
