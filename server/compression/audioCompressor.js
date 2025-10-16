const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

const SAFETY_MARGIN = 0.2 * 1024 * 1024; // 0.2MB safety margin
const MIN_BITRATE = 32; // kbps – minimum acceptable quality

/**
 * Compress an audio file to fit under a target size budget – while preserving the
 * original container / codec where possible.
 *
 * @param {string} filePath           Path to the input audio file on disk
 * @param {number} targetSizeBytes    Desired maximum size in bytes
 * @returns {Promise<{buffer:Buffer, originalSize:number, compressedSize:number, wasCompressed:boolean, bitrate:number|null}>}
 */
async function compressAudio(filePath, targetSizeBytes) {
  const originalSize = (await statAsync(filePath)).size;
  const actualTarget = targetSizeBytes - SAFETY_MARGIN;

  // If we're already under (or nearly under) target just return original bytes.
  if (originalSize <= actualTarget) {
    const originalBuffer = fs.readFileSync(filePath);
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      bitrate: null
    };
  }

  // Gather duration & bitrate using ffprobe.
  const { duration, originalBitrate, codecName } = await getAudioMetadata(filePath);
  const { ext: containerExt } = mapCodecForEncode(codecName);

  // === Smart starting bitrate guess === //
  const reductionRatio = actualTarget / originalSize; // between 0-1
  const reductionNeeded = 1 - reductionRatio;
  const heavyCompression = reductionNeeded >= 0.5; // 50%+ reduction

  let startBitrate = Math.floor(originalBitrate * reductionRatio);
  startBitrate = Math.max(MIN_BITRATE, Math.min(originalBitrate, startBitrate));

  const minBitrate = MIN_BITRATE;
  const maxBitrate = originalBitrate;

  // Run strategic binary-search / extrapolation loop.
  const { bestBitrate, bestSize, bestBuffer } = await binarySearchBitrate(
    filePath,
    actualTarget,
    startBitrate,
    minBitrate,
    maxBitrate,
    duration,
    codecName,
    containerExt,
    heavyCompression,
    reductionNeeded
  );

  // Fall-back handling if compression failed or improvement is negligible.
  if (!bestBuffer || bestBitrate === null || bestSize >= originalSize * 0.98) {
    const originalBuffer = fs.readFileSync(filePath);
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      bitrate: null
    };
  }

  return {
    buffer: bestBuffer,
    originalSize,
    compressedSize: bestSize,
    wasCompressed: true,
    bitrate: bestBitrate
  };
}

async function binarySearchBitrate(
  filePath,
  targetSize,
  startBitrate,
  minBitrate,
  maxBitrate,
  duration,
  codecName,
  containerExt,
  heavyCompression,
  reductionNeeded
) {
  let bestBitrate = null;
  let bestSize = Infinity;
  let bestBuffer = null;
  const dataPoints = [];
  const tempFiles = [];

  try {
    let currentBitrate = startBitrate;

    for (let attempt = 0; attempt < 8; attempt++) {
      const tempPath = `${filePath}.tmp${attempt}.${containerExt}`;
      tempFiles.push(tempPath);

      const { buffer: outBuffer, size: outSize } = await encodeAudio(
        filePath,
        tempPath,
        currentBitrate,
        codecName,
        containerExt,
        heavyCompression,
        reductionNeeded
      );

      dataPoints.push({ bitrate: currentBitrate, size: outSize });

      if (outSize <= targetSize) {
        // Valid candidate – keep if closer to target than previous best.
        if (bestBitrate === null || outSize > bestSize) {
          bestBitrate = currentBitrate;
          bestSize = outSize;
          bestBuffer = outBuffer;
        }

        // Early exit if within 1% of target size.
        if ((targetSize - outSize) / targetSize <= 0.01) break;

        // Try increasing bitrate to get closer to target.
        minBitrate = Math.min(maxBitrate, currentBitrate + 16);
      } else {
        // Over budget – need stronger compression (lower bitrate).
        maxBitrate = Math.max(minBitrate, currentBitrate - 16);
      }

      // Compute next bitrate using extrapolation if we have two points, otherwise midpoint.
      let nextBitrate;
      if (dataPoints.length >= 2) {
        const [p1, p2] = dataPoints.slice(-2);
        const rate = (p2.size - p1.size) / (p2.bitrate - p1.bitrate || 1);
        const neededDiff = targetSize - p2.size;
        nextBitrate = Math.round(p2.bitrate + neededDiff / rate);
      } else {
        nextBitrate = Math.floor((minBitrate + maxBitrate) / 2);
      }

      // Clamp & bail if search range collapsed.
      nextBitrate = Math.max(minBitrate, Math.min(maxBitrate, nextBitrate));
      if (Math.abs(currentBitrate - nextBitrate) < 8) break; // range too narrow

      currentBitrate = nextBitrate;
    }

    return { bestBitrate, bestSize, bestBuffer };
  } finally {
    // Cleanup temp files.
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) await unlinkAsync(f);
      } catch (_) {}
    }
  }
}

function mapCodecForEncode(codecName) {
  // Map ffprobe codec_name to ffmpeg encode codec and container extension.
  switch (codecName) {
    case 'mp3':
    case 'mp2':
    case 'mp1':
      return { encodeCodec: 'libmp3lame', ext: 'mp3' };
    case 'aac':
      return { encodeCodec: 'aac', ext: 'aac' };
    case 'vorbis':
      return { encodeCodec: 'libvorbis', ext: 'ogg' };
    case 'opus':
      return { encodeCodec: 'libopus', ext: 'opus' };
    case 'flac':
      // FLAC is lossless – re-encode with compression level 12.  Extension stays flac.
      return { encodeCodec: 'flac', ext: 'flac' };
    case 'wav':
    case 'pcm_s16le':
      // WAV/PCM – cannot bitrate compress; keep wav container.
      return { encodeCodec: 'pcm_s16le', ext: 'wav' };
    default:
      // Default to AAC in m4a container.
      return { encodeCodec: 'aac', ext: 'm4a' };
  }
}

async function encodeAudio(inputPath, outputPath, bitrate, codecName, containerExt, heavy, reductionNeeded) {
  return new Promise((resolve, reject) => {
    const { encodeCodec } = mapCodecForEncode(codecName);

    const cmd = ffmpeg(inputPath)
      .noVideo()
      .audioCodec(encodeCodec)
      .outputOptions(['-y', '-map_metadata', '0']);

    const debug = process.env.DEBUG_COMPRESSION === 'true';

    // Optionally trim silence for heavy compression
    if (heavy) {
      cmd.audioFilters('silenceremove=start_periods=1:start_threshold=-50dB:detection=peak');
    }

    // For lossless codecs, bitrate flag is not applicable
    if (!['flac', 'pcm_s16le'].includes(encodeCodec)) {
      if (encodeCodec === 'libmp3lame') {
        // Use VBR quality scale instead of fixed bitrate
        const qscale = bitrateToQscale(bitrate);
        cmd.outputOptions(`-q:a ${qscale}`);
      } else {
        cmd.audioBitrate(`${bitrate}k`);
      }

      if (bitrate <= 32) {
        cmd.audioChannels(1).audioFrequency(22050);
      } else {
        cmd.audioChannels(2).audioFrequency(44100);
      }
    } else if (encodeCodec === 'flac') {
      cmd.outputOptions(['-compression_level', '12']);
    }

    if (['m4a','mp4'].includes(containerExt)) {
      cmd.outputOptions(['-movflags +faststart']);
    }

    if (debug) {
      cmd.on('start', cmdLine => console.log('[FFmpeg]', cmdLine))
         .on('stderr', line => console.log('[FFmpeg]', line));
    }

    cmd.save(outputPath)
      .on('end', () => {
        try {
          const buffer = fs.readFileSync(outputPath);
          resolve({ buffer, size: buffer.length });
        } catch (e) {
          reject(e);
        }
      })
      .on('error', err => {
        reject(new Error(`FFmpeg audio encode failed: ${err.message}`));
      });
  });
}

function bitrateToQscale(bitrate) {
  if (bitrate <= 64) return 7;
  if (bitrate <= 96) return 5;
  if (bitrate <= 128) return 4;
  if (bitrate <= 160) return 2;
  return 0;
}

async function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const audioStream = data.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) return reject(new Error('No audio stream found'));

      const duration = parseFloat(data.format.duration || 0);
      const bitrate = parseInt(data.format.bit_rate || 0) / 1000; // kbps
      const codecName = audioStream.codec_name || 'aac';
      resolve({ duration, originalBitrate: Math.floor(bitrate), codecName });
    });
  });
}

module.exports = { compressAudio };
