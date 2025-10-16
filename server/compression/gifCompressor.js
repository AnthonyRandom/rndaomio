const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const gifsicle = require('gifsicle').default;

const execFilePromise = promisify(execFile);

const SAFETY_MARGIN = 0.2 * 1024 * 1024; // 0.2MB safety margin

async function compressGif(filePath, targetSizeBytes) {
  const originalBuffer = fs.readFileSync(filePath);
  const originalSize = originalBuffer.length;
  const actualTarget = targetSizeBytes - SAFETY_MARGIN;

  // Check if already under target
  if (originalSize <= actualTarget) {
    console.log('[GifCompressor] File already under target size');
    return {
      buffer: originalBuffer,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false,
      lossyLevel: null
    };
  }

  console.log('[GifCompressor] Starting binary search compression');
  console.log(`[GifCompressor] Original: ${originalSize} bytes, Target: ${actualTarget} bytes`);

  // Predict optimal starting color level based on reduction needed and file size
  // With lossy up to 2000, we can achieve high compression with more colors
  // Only drop to 32/64 for truly extreme scenarios
  const compressionRatio = actualTarget / originalSize;
  const reductionNeeded = 1 - compressionRatio;
  const fileSizeMB = originalSize / (1024 * 1024);
  
  let startingColors;
  
  if (reductionNeeded >= 0.95 || (reductionNeeded >= 0.90 && fileSizeMB > 100)) {
    // Truly extreme: 95%+ reduction or 90%+ on massive files
    startingColors = 32;
    console.log(`[GifCompressor] Extreme compression (${(reductionNeeded * 100).toFixed(1)}% reduction) → starting with 32 colors`);
  } else if (reductionNeeded >= 0.90 || (reductionNeeded >= 0.85 && fileSizeMB > 50)) {
    // Very extreme compression scenarios
    startingColors = 64;
    console.log(`[GifCompressor] Very high compression (${(reductionNeeded * 100).toFixed(1)}% reduction, ${fileSizeMB.toFixed(1)}MB) → starting with 64 colors`);
  } else if (reductionNeeded >= 0.70 || fileSizeMB > 30) {
    // High compression or large files - with lossy 2000, 128 colors should handle most cases
    startingColors = 128;
    console.log(`[GifCompressor] High compression scenario → starting with 128 colors`);
  } else {
    // Moderate compression - start with best quality
    startingColors = 256;
    console.log(`[GifCompressor] Moderate compression → starting with 256 colors`);
  }

  // Try with starting color level
  let result = await binarySearchLossy(filePath, actualTarget, startingColors, originalSize);
  
  // If we couldn't reach target, try reducing colors progressively (skip already-tried levels)
  if (result.bestLossy === null) {
    if (startingColors > 128) {
      console.log('[GifCompressor] Could not reach target with 256 colors, trying 128 colors');
      result = await binarySearchLossy(filePath, actualTarget, 128, originalSize);
    }
    
    if (result.bestLossy === null && startingColors > 64) {
      console.log('[GifCompressor] Could not reach target with 128 colors, trying 64 colors');
      result = await binarySearchLossy(filePath, actualTarget, 64, originalSize);
    }
    
    if (result.bestLossy === null && startingColors > 32) {
      console.log('[GifCompressor] Could not reach target with 64 colors, trying 32 colors');
      result = await binarySearchLossy(filePath, actualTarget, 32, originalSize);
    }
    
    if (result.bestLossy === null) {
      throw new Error('Unable to compress GIF below target size even with 32 colors and max lossy');
    }
  }

  // Use the best result we already found
  console.log(`[GifCompressor] Best result: Lossy ${result.bestLossy}, Colors ${result.colors}, Size ${result.bestSize} bytes`);

  return {
    buffer: result.bestBuffer,
    originalSize,
    compressedSize: result.bestSize,
    wasCompressed: true,
    lossyLevel: result.bestLossy,
    colors: result.colors
  };
}

async function binarySearchLossy(filePath, targetSize, colors, originalSize) {
  // Calculate compression ratio needed
  const compressionRatio = targetSize / originalSize;
  const reductionNeeded = 1 - compressionRatio;
  
  console.log(`[GifCompressor] Need ${(reductionNeeded * 100).toFixed(1)}% size reduction`);
  
  const MAX_LOSSY = 2000; // Gifsicle can handle much higher lossy values
  
  // Calculate initial guess based on BOTH reduction needed AND file size
  // Larger files need exponentially higher lossy values
  const fileSizeMB = originalSize / (1024 * 1024);
  
  let baseGuess;
  if (reductionNeeded >= 0.75) {
    baseGuess = 200;
  } else if (reductionNeeded >= 0.60) {
    baseGuess = 160;
  } else if (reductionNeeded >= 0.45) {
    baseGuess = 130;
  } else if (reductionNeeded >= 0.30) {
    baseGuess = 100;
  } else {
    baseGuess = 70;
  }
  
  // Scale up lossy for larger files - but only if reduction is also significant
  // Small reductions on large files shouldn't be overly aggressive
  let fileSizeMultiplier = 1;
  
  if (fileSizeMB > 30) {
    // Large files (>30MB)
    if (reductionNeeded >= 0.60) {
      fileSizeMultiplier = 3.5;  // High compression needed
    } else if (reductionNeeded >= 0.40) {
      fileSizeMultiplier = 2.2;  // Moderate compression
    } else {
      fileSizeMultiplier = 1.5;  // Light compression
    }
  } else if (fileSizeMB > 20) {
    if (reductionNeeded >= 0.60) {
      fileSizeMultiplier = 2.5;
    } else if (reductionNeeded >= 0.40) {
      fileSizeMultiplier = 1.8;
    } else {
      fileSizeMultiplier = 1.3;
    }
  } else if (fileSizeMB > 10) {
    if (reductionNeeded >= 0.60) {
      fileSizeMultiplier = 1.8;
    } else {
      fileSizeMultiplier = 1.3;
    }
  } else if (fileSizeMB > 5) {
    fileSizeMultiplier = 1.2;
  }
  
  const initialGuess = Math.min(MAX_LOSSY, Math.round(baseGuess * fileSizeMultiplier));
  
  console.log(`[GifCompressor] File size ${fileSizeMB.toFixed(1)}MB → multiplier ${fileSizeMultiplier}x → starting lossy ${initialGuess}`);
  
  let bestLossy = null;
  let bestSize = Infinity;
  let bestBuffer = null;
  const dataPoints = [];
  
  // First attempt with smart guess
  let currentLossy = initialGuess;
  let compressedBuffer = await compressAtLossy(filePath, currentLossy, colors);
  let compressedSize = compressedBuffer.length;
  
  console.log(`[GifCompressor] Lossy ${currentLossy} (${colors} colors): ${compressedSize} bytes`);
  dataPoints.push({ lossy: currentLossy, size: compressedSize });
  
  if (compressedSize <= targetSize) {
    bestLossy = currentLossy;
    bestSize = compressedSize;
    bestBuffer = compressedBuffer;
    
    // For extreme compression needs (>60% reduction), accept this result without refinement
    if (reductionNeeded >= 0.60) {
      console.log(`[GifCompressor] Extreme compression case - accepting first valid result`);
      return { bestLossy, bestSize, bestBuffer, colors };
    }
  }
  
  // Make up to 3 strategic attempts to find target
  const maxAttempts = 4;
  
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    let nextLossy;
    
    if (dataPoints.length >= 2) {
      // Use last two points to extrapolate
      const lastTwo = dataPoints.slice(-2);
      const [point1, point2] = lastTwo;
      
      const lossyDiff = point2.lossy - point1.lossy;
      const sizeDiff = point2.size - point1.size;
      
      if (sizeDiff === 0) {
        // No size change, try a large jump
        nextLossy = Math.min(MAX_LOSSY, currentLossy + 500);
        console.log(`[GifCompressor] No size change detected, jumping to lossy ${nextLossy}`);
      } else {
        const ratePerLossy = sizeDiff / lossyDiff;
        
        const sizeNeeded = targetSize - point2.size;
        const lossyNeeded = sizeNeeded / ratePerLossy;
        nextLossy = Math.round(point2.lossy + lossyNeeded);
        
        // Clamp to valid range
        nextLossy = Math.max(30, Math.min(MAX_LOSSY, nextLossy));
        
        console.log(`[GifCompressor] Extrapolating: ${ratePerLossy.toFixed(0)} bytes/lossy → trying lossy ${nextLossy}`);
      }
    } else {
      // Make calculated jump based on size ratio
      if (compressedSize > targetSize) {
        // Need more compression - extrapolate based on compression rate so far
        const currentReduction = 1 - (compressedSize / originalSize);
        const additionalReduction = (compressedSize - targetSize) / compressedSize;
        
        // Estimate lossy needed for additional reduction
        const lossyPerReduction = currentLossy / currentReduction;
        const additionalLossy = Math.ceil(lossyPerReduction * additionalReduction);
        
        nextLossy = Math.min(MAX_LOSSY, currentLossy + additionalLossy);
        console.log(`[GifCompressor] Need ${(additionalReduction * 100).toFixed(1)}% more reduction → jumping to lossy ${nextLossy}`);
      } else {
        // Try less compression (but large jump for speed)
        nextLossy = Math.max(30, currentLossy - 40);
        console.log(`[GifCompressor] Trying lower lossy for better quality: ${nextLossy}`);
      }
    }
    
    // Avoid testing same value twice
    if (dataPoints.some(dp => dp.lossy === nextLossy)) {
      console.log(`[GifCompressor] Already tested lossy ${nextLossy}, stopping`);
      break;
    }
    
    currentLossy = nextLossy;
    compressedBuffer = await compressAtLossy(filePath, currentLossy, colors);
    compressedSize = compressedBuffer.length;
    
    console.log(`[GifCompressor] Lossy ${currentLossy} (${colors} colors): ${compressedSize} bytes`);
    dataPoints.push({ lossy: currentLossy, size: compressedSize });
    
    if (compressedSize <= targetSize) {
      if (bestLossy === null || compressedSize > bestSize) {
        bestLossy = currentLossy;
        bestSize = compressedSize;
        bestBuffer = compressedBuffer;
      }
      // Found valid result, stop here
      break;
    }
    
    // Check if we're VERY close (within 1% of target) - accept it as good enough
    const percentageOver = ((compressedSize - targetSize) / targetSize) * 100;
    if (percentageOver <= 1.0 && percentageOver > 0) {
      console.log(`[GifCompressor] Within 1% of target (${percentageOver.toFixed(2)}% over) - trying slightly higher lossy`);
      // Try just a bit higher
      const tinyBump = currentLossy + Math.max(5, Math.ceil(percentageOver * 10));
      if (tinyBump <= MAX_LOSSY && !dataPoints.some(dp => dp.lossy === tinyBump)) {
        currentLossy = tinyBump;
        compressedBuffer = await compressAtLossy(filePath, currentLossy, colors);
        compressedSize = compressedBuffer.length;
        console.log(`[GifCompressor] Lossy ${currentLossy} (${colors} colors): ${compressedSize} bytes`);
        
        if (compressedSize <= targetSize) {
          bestLossy = currentLossy;
          bestSize = compressedSize;
          bestBuffer = compressedBuffer;
          break;
        }
      }
    }
  }
  
  return { bestLossy, bestSize, bestBuffer, colors };
}

async function compressAtLossy(filePath, lossyLevel, colors) {
  const outputPath = `${filePath}.tmp.gif`;
  
  try {
    // gifsicle command: --lossy=LEVEL --colors=NUM --optimize=3
    const args = [
      '--lossy=' + lossyLevel,
      '--colors=' + colors,
      '--optimize=3',
      filePath,
      '-o',
      outputPath
    ];

    await execFilePromise(gifsicle, args);
    
    const buffer = fs.readFileSync(outputPath);
    
    // Cleanup temp file
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    return buffer;
  } catch (error) {
    // Cleanup temp file on error
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw new Error(`Gifsicle compression failed: ${error.message}`);
  }
}

module.exports = { compressGif };

