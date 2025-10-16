const sharp = require('sharp');
const fs = require('fs');

const SAFETY_MARGIN = 0.2 * 1024 * 1024; // 0.2MB safety margin

async function compressImage(filePath, targetSizeBytes, mimetype) {
  const originalBuffer = fs.readFileSync(filePath);
  const originalSize = originalBuffer.length;
  const actualTarget = targetSizeBytes - SAFETY_MARGIN;

  // Check if already under target
  if (originalSize <= actualTarget) {
    console.log('[ImageCompressor] File already under target size');
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      quality: null
    };
  }

  console.log('[ImageCompressor] Starting smart compression');
  console.log(`[ImageCompressor] Original: ${originalSize} bytes, Target: ${actualTarget} bytes`);

  // Determine format
  const format = getFormatFromMimetype(mimetype);
  
  // Calculate compression ratio and make smart initial guess
  const compressionRatio = actualTarget / originalSize;
  const reductionNeeded = 1 - compressionRatio;
  const fileSizeMB = originalSize / (1024 * 1024);
  
  console.log(`[ImageCompressor] Need ${(reductionNeeded * 100).toFixed(1)}% size reduction`);
  
  // Smart initial quality guess (lower quality = more compression)
  // Note: Quality scale is inverted from GIF lossy
  let initialGuess;
  if (reductionNeeded >= 0.75) {
    initialGuess = 20;  // Very aggressive compression
  } else if (reductionNeeded >= 0.60) {
    initialGuess = 35;
  } else if (reductionNeeded >= 0.45) {
    initialGuess = 50;
  } else if (reductionNeeded >= 0.30) {
    initialGuess = 65;
  } else {
    initialGuess = 80;  // Light compression
  }
  
  // Adjust for file size - larger files may need slightly lower quality
  if (fileSizeMB > 20 && reductionNeeded >= 0.50) {
    initialGuess = Math.max(1, initialGuess - 10);
  } else if (fileSizeMB > 10 && reductionNeeded >= 0.50) {
    initialGuess = Math.max(1, initialGuess - 5);
  }
  
  console.log(`[ImageCompressor] Starting with quality ${initialGuess}`);
  
  let bestQuality = null;
  let bestBuffer = null;
  let bestSize = Infinity;
  const dataPoints = [];
  
  // First attempt with smart guess
  let currentQuality = initialGuess;
  let compressedBuffer = await compressAtQuality(originalBuffer, format, currentQuality);
  let compressedSize = compressedBuffer.length;
  
  console.log(`[ImageCompressor] Quality ${currentQuality}: ${compressedSize} bytes`);
  dataPoints.push({ quality: currentQuality, size: compressedSize });
  
  if (compressedSize <= actualTarget) {
    bestQuality = currentQuality;
    bestBuffer = compressedBuffer;
    bestSize = compressedSize;
  }
  
  // Make up to 3 more strategic attempts
  const maxAttempts = 4;
  
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    let nextQuality;
    
    if (dataPoints.length >= 2) {
      // Use last two points to extrapolate
      const lastTwo = dataPoints.slice(-2);
      const [point1, point2] = lastTwo;
      
      const qualityDiff = point2.quality - point1.quality;
      const sizeDiff = point2.size - point1.size;
      
      if (sizeDiff === 0) {
        // No size change, make a jump
        nextQuality = compressedSize > actualTarget ? 
          Math.max(1, currentQuality - 15) : 
          Math.min(100, currentQuality + 15);
        console.log(`[ImageCompressor] No size change, jumping to quality ${nextQuality}`);
      } else {
        const ratePerQuality = sizeDiff / qualityDiff;
        const sizeNeeded = actualTarget - point2.size;
        const qualityNeeded = sizeNeeded / ratePerQuality;
        nextQuality = Math.round(point2.quality + qualityNeeded);
        
        // Clamp to valid range
        nextQuality = Math.max(1, Math.min(100, nextQuality));
        
        console.log(`[ImageCompressor] Extrapolating: ${ratePerQuality.toFixed(0)} bytes/quality → trying ${nextQuality}`);
      }
    } else {
      // Make calculated jump based on size ratio
      if (compressedSize > actualTarget) {
        // Need more compression (lower quality)
        const sizeRatio = compressedSize / actualTarget;
        const jumpSize = Math.ceil(20 * (sizeRatio - 1));
        nextQuality = Math.max(1, currentQuality - jumpSize);
        console.log(`[ImageCompressor] Need more compression → jumping to quality ${nextQuality}`);
      } else {
        // Try higher quality for better result
        nextQuality = Math.min(100, currentQuality + 15);
        console.log(`[ImageCompressor] Trying higher quality: ${nextQuality}`);
      }
    }
    
    // Avoid testing same value twice
    if (dataPoints.some(dp => dp.quality === nextQuality)) {
      console.log(`[ImageCompressor] Already tested quality ${nextQuality}, stopping`);
      break;
    }
    
    currentQuality = nextQuality;
    compressedBuffer = await compressAtQuality(originalBuffer, format, currentQuality);
    compressedSize = compressedBuffer.length;
    
    console.log(`[ImageCompressor] Quality ${currentQuality}: ${compressedSize} bytes`);
    dataPoints.push({ quality: currentQuality, size: compressedSize });
    
    if (compressedSize <= actualTarget) {
      if (bestQuality === null || compressedSize > bestSize) {
        bestQuality = currentQuality;
        bestBuffer = compressedBuffer;
        bestSize = compressedSize;
      }
      // Found valid result, stop here
      break;
    }
    
    // Check if we're VERY close (within 1% of target)
    const percentageOver = ((compressedSize - actualTarget) / actualTarget) * 100;
    if (percentageOver <= 1.0 && percentageOver > 0) {
      console.log(`[ImageCompressor] Within 1% of target (${percentageOver.toFixed(2)}% over) - trying slightly lower quality`);
      const tinyAdjust = currentQuality - Math.max(1, Math.ceil(percentageOver * 2));
      if (tinyAdjust >= 1 && !dataPoints.some(dp => dp.quality === tinyAdjust)) {
        currentQuality = tinyAdjust;
        compressedBuffer = await compressAtQuality(originalBuffer, format, currentQuality);
        compressedSize = compressedBuffer.length;
        console.log(`[ImageCompressor] Quality ${currentQuality}: ${compressedSize} bytes`);
        
        if (compressedSize <= actualTarget) {
          bestQuality = currentQuality;
          bestBuffer = compressedBuffer;
          bestSize = compressedSize;
          break;
        }
      }
    }
  }

  if (bestQuality === null) {
    throw new Error('Unable to compress image below target size');
  }

  console.log(`[ImageCompressor] Best result: Quality ${bestQuality}, Size ${bestSize} bytes`);

  return {
    buffer: bestBuffer,
    originalSize,
    compressedSize: bestSize,
    wasCompressed: true,
    quality: bestQuality
  };
}

async function compressAtQuality(buffer, format, quality) {
  let sharpInstance = sharp(buffer); // By default strips metadata for smaller size

  if (format === 'jpeg') {
    sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
  } else if (format === 'png') {
    sharpInstance = sharpInstance.png({ quality, compressionLevel: 9 });
  } else if (format === 'webp') {
    sharpInstance = sharpInstance.webp({ quality });
  } else if (format === 'avif') {
    sharpInstance = sharpInstance.avif({ quality });
  } else if (format === 'tiff') {
    // TIFF with JPEG compression (supports quality)
    sharpInstance = sharpInstance.tiff({ 
      quality,
      compression: 'jpeg' 
    });
  }

  return await sharpInstance.toBuffer();
}

function getFormatFromMimetype(mimetype) {
  if (mimetype === 'image/jpeg') return 'jpeg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  if (mimetype === 'image/avif') return 'avif';
  if (mimetype === 'image/tiff') return 'tiff';
  return 'jpeg'; // fallback
}

module.exports = { compressImage };

