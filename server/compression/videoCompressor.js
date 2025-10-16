const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

const SAFETY_MARGIN = 0.2 * 1024 * 1024; // 0.2MB safety margin

// Resolution steps for fallback
const RESOLUTION_STEPS = [
  { name: '1080p', height: 1080 },
  { name: '720p', height: 720 },
  { name: '480p', height: 480 },
  { name: '360p', height: 360 },
];

async function compressVideo(filePath, targetSizeBytes) {
  const originalSize = (await statAsync(filePath)).size;
  const actualTarget = targetSizeBytes - SAFETY_MARGIN;

  // Check if already under target
  if (originalSize <= actualTarget) {
    console.log('[VideoCompressor] File already under target size');
    const originalBuffer = fs.readFileSync(filePath);
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      bitrate: null
    };
  }

  console.log('[VideoCompressor] Starting smart compression');
  console.log(`[VideoCompressor] Original: ${originalSize} bytes, Target: ${actualTarget} bytes`);

  // Get video metadata
  const metadata = await getVideoMetadata(filePath);
  console.log(`[VideoCompressor] Metadata:`, metadata);

  const { duration, originalBitrate, width, height } = metadata;
  const fileSizeMB = originalSize / (1024 * 1024);
  const targetSizeMB = actualTarget / (1024 * 1024);

  // Calculate reduction ratio and smart initial guess
  const reductionRatio = actualTarget / originalSize;
  // ===== Dynamic audio re-encode ===== //
  const targetTotalBitrate = Math.floor((targetSizeMB * 8 * 1024) / duration); // total kbps budget

  // Choose audio bitrate on a ladder: 32 → 16 → 12 → 8 → mute
  let desiredAudioBitrate;
  if (targetTotalBitrate < 40) {
    desiredAudioBitrate = 0;          // mute — budget too small for usable audio
  } else if (targetTotalBitrate < 80) {
    desiredAudioBitrate = 24;         // new floor: 24 kb/s mono (AAC-LC)
  } else {
    desiredAudioBitrate = Math.min(32, Math.floor(targetTotalBitrate * 0.25)); // 24–32 kb/s range
  }

  const targetVideoBitrate = Math.max(8, targetTotalBitrate - desiredAudioBitrate);
  
  // Allow very low minimums for long videos or small targets
  let minBitrate = Math.max(8, Math.floor(targetVideoBitrate * 0.5)); // Start closer to target but not below 8 kbps
  let maxBitrate = originalBitrate;
  
  const startBitrate = Math.max(minBitrate, Math.min(maxBitrate, targetVideoBitrate));

  console.log(`[VideoCompressor] Original bitrate: ${originalBitrate}kbps, Target total: ${targetTotalBitrate}kbps (video: ${targetVideoBitrate}kbps + audio: ${desiredAudioBitrate}kbps), Initial guess: ${startBitrate}kbps`);

  // Try compression with current resolution
  let result = await binarySearchBitrate(
    filePath,
    actualTarget,
    startBitrate,
    minBitrate,
    maxBitrate,
    duration,
    width,
    height,
    originalSize,
    targetVideoBitrate,
    reductionRatio,
    desiredAudioBitrate
  );

  // If couldn't reach target with bitrate alone, try reducing resolution
  if (result.bestBitrate === null) {
    console.log('[VideoCompressor] Could not reach target with bitrate alone, trying resolution reduction');
    
    const currentResolutionIndex = RESOLUTION_STEPS.findIndex(r => r.height >= height);
    const startIndex = currentResolutionIndex >= 0 ? currentResolutionIndex + 1 : 1;

    for (let i = startIndex; i < RESOLUTION_STEPS.length; i++) {
      const resolution = RESOLUTION_STEPS[i];
      console.log(`[VideoCompressor] Trying ${resolution.name} resolution`);

      // Recalculate bitrate range for new resolution
      const resolutionRatio = (resolution.height * resolution.height) / (height * height);
      maxBitrate = Math.floor(originalBitrate * resolutionRatio);
      minBitrate = Math.max(8, Math.floor(targetVideoBitrate * 0.7));
      const newStartBitrate = Math.max(minBitrate, Math.min(maxBitrate, Math.floor(targetVideoBitrate)));

      const newWidth = Math.floor(width * (resolution.height / height));
      
      result = await binarySearchBitrate(
        filePath,
        actualTarget,
        newStartBitrate,
        minBitrate,
        maxBitrate,
        duration,
        newWidth,
        resolution.height,
        originalSize,
        targetVideoBitrate,
        reductionRatio,
        desiredAudioBitrate
      );

      if (result.bestBitrate !== null) {
        break;
      }
    }
  }

  // Check if compression was minimal
  if (result.bestSize >= originalSize * 0.95) {
    console.log('[VideoCompressor] Minimal improvement, returning original');
    const originalBuffer = fs.readFileSync(filePath);
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      bitrate: null
    };
  }

  if (result.bestBitrate === null || result.bestBuffer === null) {
    throw new Error('Unable to compress video below target size');
  }

  console.log(`[VideoCompressor] Best result: Bitrate ${result.bestBitrate}kbps, Size ${result.bestSize} bytes`);

  return {
    buffer: result.bestBuffer,
    originalSize,
    compressedSize: result.bestSize,
    wasCompressed: true,
    bitrate: result.bestBitrate,
    audioMuted: desiredAudioBitrate === 0
  };
}

async function binarySearchBitrate(
  filePath,
  targetSize,
  startBitrate,
  minBitrate,
  maxBitrate,
  duration,
  width,
  height,
  originalSize,
  targetBitrate,
  reductionRatio,
  audioBitrate
) {
  const reductionNeeded = 1 - (targetSize / originalSize);
  console.log(`[VideoCompressor] Need ${(reductionNeeded * 100).toFixed(1)}% size reduction`);

  let bestBitrate = null;
  let bestSize = Infinity;
  let bestBuffer = null;
  const dataPoints = [];
  const tempFiles = [];

  try {
    // First attempt with smart guess
    let currentBitrate = startBitrate;
    const tempPath1 = `${filePath}.tmp1.mp4`;
    tempFiles.push(tempPath1);

    let { buffer: compressedBuffer, size: compressedSize } = await encodeVideo(
      filePath,
      tempPath1,
      currentBitrate,
      width,
      height,
      audioBitrate
    );

    console.log(`[VideoCompressor] Bitrate ${currentBitrate}kbps: ${compressedSize} bytes`);
    dataPoints.push({ bitrate: currentBitrate, size: compressedSize });

    if (compressedSize <= targetSize) {
      bestBitrate = currentBitrate;
      bestSize = compressedSize;
      bestBuffer = compressedBuffer;

      // Check if within 1% of target - if so, we're done
      const percentBelow = ((targetSize - compressedSize) / targetSize) * 100;
      if (percentBelow <= 1.0) {
        console.log(`[VideoCompressor] Within 1% of target (${percentBelow.toFixed(2)}% below) - stopping`);
        return { bestBitrate, bestSize, bestBuffer };
      }
    }

    // Make up to 8 strategic attempts
    const maxAttempts = 8;

    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      let nextBitrate;

      if (dataPoints.length >= 2) {
        // Use last two points to extrapolate
        const lastTwo = dataPoints.slice(-2);
        const [point1, point2] = lastTwo;

        const bitrateDiff = point2.bitrate - point1.bitrate;
        const sizeDiff = point2.size - point1.size;

        if (Math.abs(sizeDiff) < 1000) {
          // No significant size change, make a jump
          if (compressedSize > targetSize) {
            nextBitrate = Math.max(minBitrate, currentBitrate - 100);
            maxBitrate = currentBitrate - 20; // Update max to narrow range
          } else {
            nextBitrate = Math.min(maxBitrate, currentBitrate + 100);
            minBitrate = currentBitrate + 20; // Update min to narrow range
          }
          console.log(`[VideoCompressor] No size change, jumping to bitrate ${nextBitrate}kbps`);
        } else {
          // Extrapolate
          const ratePerBitrate = sizeDiff / bitrateDiff;
          const sizeNeeded = targetSize - point2.size;
          const bitrateNeeded = sizeNeeded / ratePerBitrate;
          nextBitrate = Math.round(point2.bitrate + bitrateNeeded);

          // Clamp to valid range and update bounds
          nextBitrate = Math.max(minBitrate, Math.min(maxBitrate, nextBitrate));
          
          // Update search range based on prediction
          if (sizeNeeded < 0) {
            // Current size is over target, need lower bitrate
            maxBitrate = Math.max(minBitrate + 20, nextBitrate + 50);
          } else {
            // Current size is under target, need higher bitrate
            minBitrate = Math.min(maxBitrate - 20, nextBitrate - 50);
          }

          console.log(`[VideoCompressor] Extrapolating: ${ratePerBitrate.toFixed(0)} bytes/kbps → trying ${nextBitrate}kbps (range now ${minBitrate}-${maxBitrate})`);
        }
      } else {
        // Binary search based on whether we're over or under target
        if (compressedSize > targetSize) {
          maxBitrate = currentBitrate - 50; // Reduce max by 50kbps
          if (maxBitrate < minBitrate) {
            maxBitrate = minBitrate; // Prevent invalid range
          }
          nextBitrate = Math.floor((minBitrate + maxBitrate) / 2);
          
          // If range becomes invalid, try going even lower
          if (nextBitrate <= minBitrate && minBitrate > 200) {
            minBitrate = Math.max(200, minBitrate - 100); // Lower the minimum
            nextBitrate = Math.floor((minBitrate + maxBitrate) / 2);
          }
          console.log(`[VideoCompressor] Over target, reducing max to ${maxBitrate}kbps, trying ${nextBitrate}kbps`);
        } else {
          minBitrate = Math.min(maxBitrate, currentBitrate + 50);
          nextBitrate = Math.floor((minBitrate + maxBitrate) / 2);
          console.log(`[VideoCompressor] Under target, increasing min to ${minBitrate}kbps, trying ${nextBitrate}kbps`);
        }
      }

      // Avoid testing same value twice
      if (dataPoints.some(dp => Math.abs(dp.bitrate - nextBitrate) < 20)) {
        console.log(`[VideoCompressor] Already tested similar bitrate, stopping`);
        break;
      }

      // Check if range is too narrow or invalid (but allow narrow ranges early on)
      if (maxBitrate <= minBitrate) {
        console.log(`[VideoCompressor] Range collapsed to single value (${minBitrate}kbps). Testing it one last time.`);
        nextBitrate = minBitrate;
      }
      
      // Only enforce minimum range after a few attempts
      if (attempt >= 3 && maxBitrate - minBitrate <= 30) {
        console.log(`[VideoCompressor] Range too narrow (min: ${minBitrate}kbps, max: ${maxBitrate}kbps) after ${attempt} attempts, stopping`);
        break;
      }

      currentBitrate = nextBitrate;
      const tempPath = `${filePath}.tmp${attempt + 1}.mp4`;
      tempFiles.push(tempPath);

      ({ buffer: compressedBuffer, size: compressedSize } = await encodeVideo(
        filePath,
        tempPath,
        currentBitrate,
        width,
        height,
        audioBitrate
      ));

      console.log(`[VideoCompressor] Bitrate ${currentBitrate}kbps: ${compressedSize} bytes`);
      dataPoints.push({ bitrate: currentBitrate, size: compressedSize });

      if (compressedSize <= targetSize) {
        if (bestBitrate === null || compressedSize > bestSize) {
          bestBitrate = currentBitrate;
          bestSize = compressedSize;
          bestBuffer = compressedBuffer;
        }

        // Check if within 1% of target
        const percentBelow = ((targetSize - compressedSize) / targetSize) * 100;
        if (percentBelow <= 1.0) {
          console.log(`[VideoCompressor] Within 1% of target (${percentBelow.toFixed(2)}% below) - stopping`);
          break;
        }

        // Try higher bitrate to get closer
        minBitrate = Math.min(maxBitrate, currentBitrate + 100);
      } else {
        // Over target, need more compression
        maxBitrate = Math.max(minBitrate, currentBitrate - 100);

        // Check if we're very close (within 1% over)
        const percentOver = ((compressedSize - targetSize) / targetSize) * 100;
        if (percentOver <= 1.0) {
          console.log(`[VideoCompressor] Within 1% of target (${percentOver.toFixed(2)}% over) - trying slightly lower bitrate`);
          const tinyAdjust = Math.max(minBitrate, currentBitrate - Math.max(50, Math.ceil(percentOver * 50)));
          if (!dataPoints.some(dp => Math.abs(dp.bitrate - tinyAdjust) < 50)) {
            currentBitrate = tinyAdjust;
            const tempPathFinal = `${filePath}.tmpfinal.mp4`;
            tempFiles.push(tempPathFinal);

            ({ buffer: compressedBuffer, size: compressedSize } = await encodeVideo(
              filePath,
              tempPathFinal,
              currentBitrate,
              width,
              height,
              audioBitrate
            ));

            console.log(`[VideoCompressor] Bitrate ${currentBitrate}kbps: ${compressedSize} bytes`);

            if (compressedSize <= targetSize) {
              bestBitrate = currentBitrate;
              bestSize = compressedSize;
              bestBuffer = compressedBuffer;
              break;
            }
          }
        }
      }
    }

    return { bestBitrate, bestSize, bestBuffer };
  } finally {
    // Clean up ALL temp files
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          await unlinkAsync(tempFile);
          console.log(`[VideoCompressor] Cleaned up temp file: ${tempFile}`);
        }
      } catch (err) {
        console.warn(`[VideoCompressor] Failed to delete temp file ${tempFile}:`, err.message);
      }
    }
  }
}

async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      const duration = parseFloat(metadata.format.duration || 0);
      const bitrate = parseInt(metadata.format.bit_rate || 0) / 1000; // Convert to kbps
      const width = videoStream.width || 0;
      const height = videoStream.height || 0;

      resolve({
        duration,
        originalBitrate: Math.floor(bitrate),
        width,
        height
      });
    });
  });
}

async function encodeVideo(inputPath, outputPath, bitrate, width, height, audioBitrate) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .videoCodec('libx264')
      .videoBitrate(`${bitrate}k`)
      .size(`${width}x${height}`);

    if (audioBitrate && audioBitrate > 0) {
      cmd
        .audioCodec('aac')
        .audioBitrate(`${audioBitrate}k`)
        .audioChannels(audioBitrate <= 24 ? 1 : 2)
        .audioFrequency(audioBitrate <= 24 ? 22050 : 44100);
    } else {
      cmd.noAudio();
    }

    cmd.outputOptions([
      '-preset fast',
      '-movflags +faststart'
    ])
    .output(outputPath)
    .on('end', () => {
        try {
          const buffer = fs.readFileSync(outputPath);
          const size = buffer.length;
          resolve({ buffer, size });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg encoding failed: ${err.message}`));
      })
      .run();
  });
}

module.exports = { compressVideo };

