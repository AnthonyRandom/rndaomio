const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { compressImage } = require('../compression/imageCompressor');
const { compressGif } = require('../compression/gifCompressor');
const { compressVideo } = require('../compression/videoCompressor');
const { compressAudio } = require('../compression/audioCompressor');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max - reasonable limit for file compression
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/tiff',
      'image/gif'
    ];

    const blockedVideoExt = [
      '.mxf','.vob','.dv','.ogv','.rm','.rmvb','.f4v','.asf','.yuv','.braw','.r3d','.ari','.mlv','.crm','.cine'
    ];

    const ext = require('path').extname(file.originalname).toLowerCase();

    if (allowedImageTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    if (file.mimetype.startsWith('video/')) {
      if (blockedVideoExt.includes(ext)) {
        return cb(new Error(`Video format ${ext} is not supported for compression.`), false);
      }
      // Allow listed video extensions
      const allowedVideoExt = ['.mp4','.mov','.mkv','.avi','.flv','.webm','.ts','.mts','.m2ts','.wmv','.3gp'];
      if (allowedVideoExt.includes(ext)) {
        return cb(null, true);
      }
    }
    // Audio handling
    if (file.mimetype.startsWith('audio/')) {
      const allowedAudioExt = [
        '.mp3','.aac','.m4a','.ogg','.opus','.wma','.flac','.wav','.aiff','.aif','.alac'
      ];
      const blockedAudioExt = ['.ra','.ram','.mid','.midi','.amr','.ape','.ac3','.dts'];

      if (blockedAudioExt.includes(ext)) {
        return cb(new Error(`Audio format ${ext} is not supported for compression.`), false);
      }
      if (allowedAudioExt.includes(ext)) {
        return cb(null, true);
      }
    }

    cb(new Error(`Unsupported file type: ${file.originalname}`), false);
  }
});

router.post('/compress', upload.single('file'), async (req, res) => {
  const tmpFilePath = path.join(__dirname, '../tmp', `temp-${Date.now()}`);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Server-side validation
    const filename = req.file.originalname;
    if (!filename || filename.trim() === '') {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    // Check for suspicious characters in filename
    const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
    if (suspiciousChars.test(filename)) {
      return res.status(400).json({ error: 'File name contains invalid characters' });
    }

    // Check filename length
    if (filename.length > 255) {
      return res.status(400).json({ error: 'File name is too long' });
    }

    const { targetSizeBytes } = req.body;
    if (!targetSizeBytes || isNaN(parseInt(targetSizeBytes))) {
      return res.status(400).json({ error: 'Invalid target size' });
    }

    const targetSize = parseInt(targetSizeBytes);
    const originalSize = req.file.buffer.length;
    const mimetype = req.file.mimetype;

    // Validate file size
    if (originalSize === 0) {
      return res.status(400).json({ error: 'File is empty' });
    }

    if (originalSize > 500 * 1024 * 1024) { // 500MB
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit (500MB)' });
    }

    console.log(`[Server] Processing: ${req.file.originalname} (${originalSize} bytes, target: ${targetSize} bytes)`);

    // Write buffer to temporary file for compression
    fs.writeFileSync(tmpFilePath, req.file.buffer);
    
    // Route to appropriate compressor based on file type
    let result;
    if (mimetype === 'image/gif') {
      result = await compressGif(tmpFilePath, targetSize);
    } else if (mimetype.startsWith('video/')) {
      result = await compressVideo(tmpFilePath, targetSize);
    } else if (mimetype.startsWith('audio/')) {
      result = await compressAudio(tmpFilePath, targetSize);
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

    if (result.resolutionReduced !== undefined && result.resolutionReduced) {
      res.setHeader('X-Resolution-Reduced', 'true');
      res.setHeader('X-Original-Resolution', result.originalResolution || 'unknown');
      res.setHeader('X-Final-Resolution', result.finalResolution || 'unknown');
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
    console.error('[Server] Error processing file:', error.message);

    // Cleanup on error
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (err) {
      console.warn('[Server] Cleanup failed:', err.message);
    }

    // Don't expose internal error details to client
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: 'File processing failed. Please check your file and try again.',
      details: isDevelopment ? error.message : undefined,
      stack: isDevelopment ? error.stack : undefined
    });
  }
});

module.exports = router;
