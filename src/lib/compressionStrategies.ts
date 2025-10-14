import imageCompression from 'browser-image-compression'

// @ts-ignore - gifsicle-wasm-browser doesn't have TypeScript definitions
import gifsicle from 'gifsicle-wasm-browser'

export interface CompressionOptions {
  targetSizeBytes: number
  onProgress?: (progress: number) => void
}

export interface CompressionResult {
  file: File
  wasCompressed: boolean
  qualityRatio: number
  iterations: number
  warning?: string
}

const QUALITY_WARNING_THRESHOLD = 0.7
const MIN_QUALITY = 0.5
const MAX_ITERATIONS = 10

export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  console.log('[compressImage] Starting compression', {
    fileName: file.name,
    fileSize: file.size,
    targetSize: options.targetSizeBytes
  })
  
  const { targetSizeBytes, onProgress } = options
  
  if (file.size <= targetSizeBytes) {
    console.log('[compressImage] File already under target size')
    onProgress?.(100)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      file,
      wasCompressed: false,
      qualityRatio: 0,
      iterations: 0,
      warning: `Your image (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`
    }
  }

  let bestFile = file
  let quality = 1.0
  let iterations = 0
  const qualityStep = 0.05

  while (iterations < MAX_ITERATIONS && quality >= MIN_QUALITY) {
    iterations++
    console.log(`[compressImage] Iteration ${iterations}, quality: ${quality}`)
    
    try {
      const progressBase = 10 + (iterations / MAX_ITERATIONS) * 70
      
      console.log('[compressImage] Calling imageCompression library...')
      const compressed = await imageCompression(file, {
        initialQuality: quality,
        useWebWorker: false,
        onProgress: (p) => {
          onProgress?.(Math.round(progressBase + (p / 100) * (70 / MAX_ITERATIONS)))
        }
      })

      console.log(`[compressImage] Compressed to ${compressed.size} bytes (target: ${targetSizeBytes})`)

      // If we hit the target or are close to it (within 15%), use this result
      if (compressed.size <= targetSizeBytes && compressed.size >= targetSizeBytes * 0.85) {
        onProgress?.(90)
        const compressionRatio = 1 - (compressed.size / file.size)
        console.log(`[compressImage] Success! Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`)
        
        return {
          file: new File([compressed], file.name, { type: file.type }),
          wasCompressed: true,
          qualityRatio: compressionRatio,
          iterations,
          warning: compressionRatio > QUALITY_WARNING_THRESHOLD
            ? `High compression ratio (${(compressionRatio * 100).toFixed(0)}%) may result in visible quality loss.`
            : undefined
        }
      }

      // Keep track of the best result (closest to target size)
      // Prioritize files that are under target, but also consider overshot results
      const currentDistance = Math.abs(compressed.size - targetSizeBytes)
      const bestDistance = Math.abs(bestFile.size - targetSizeBytes)

      if (currentDistance < bestDistance) {
        bestFile = new File([compressed], file.name, { type: file.type })
        console.log(`[compressImage] New best result: ${bestFile.size} bytes (distance to target: ${currentDistance}) at quality ${quality}`)
      }

      // Continue adjusting quality to get closer to target
      if (compressed.size > targetSizeBytes) {
        quality -= qualityStep
      } else {
        // Too small, we overshot - continue to see if we can get closer
        quality -= qualityStep
      }
    } catch (error) {
      console.error('[compressImage] Iteration failed:', error)
      break
    }
  }

  onProgress?.(90)
  const compressionRatio = 1 - (bestFile.size / file.size)
  const bestSizeMB = (bestFile.size / (1024 * 1024)).toFixed(2)
  const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)

  return {
    file: bestFile,
    wasCompressed: bestFile !== file,
    qualityRatio: compressionRatio,
    iterations,
    warning: bestFile.size > targetSizeBytes
      ? `Unable to reach target size. Best result: ${bestSizeMB} MB (target: ${targetSizeMB} MB). Consider reducing target size or using a different format.`
      : compressionRatio > QUALITY_WARNING_THRESHOLD
      ? `High compression ratio (${(compressionRatio * 100).toFixed(0)}%) may result in visible quality loss.`
      : undefined
  }
}

export async function compressGIF(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  console.log('[compressGIF] Starting gifsicle compression', {
    fileName: file.name,
    fileSize: file.size,
    targetSize: options.targetSizeBytes
  })

  const { targetSizeBytes, onProgress } = options

  if (file.size <= targetSizeBytes) {
    onProgress?.(100)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      file,
      wasCompressed: false,
      qualityRatio: 0,
      iterations: 0,
      warning: `Your GIF (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`
    }
  }

  // Calculate compression ratio needed
  const compressionRatioNeeded = 1 - (targetSizeBytes / file.size)
  console.log(`[compressGIF] Need ${(compressionRatioNeeded * 100).toFixed(1)}% size reduction`)

  // Determine starting phase based on file size
  const isExtraLargeFile = file.size >= 30 * 1024 * 1024 // 30MB+ start at phase 4
  const isLargeFile = file.size >= 20 * 1024 * 1024 // 20MB+ start at phase 3
  const startPhase = isExtraLargeFile ? 4 : isLargeFile ? 3 : 1
  console.log(`[compressGIF] File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB, starting at phase ${startPhase}`)

  // Adaptive compression strategies based on file size
  const compressionStrategies = []

  // Phase 1: Gentle lossy compression only (preserves quality - small files only)
  if (startPhase <= 1) {
    compressionStrategies.push(
      { level: 3, lossy: 50, description: 'gentle lossy compression' },
      { level: 3, lossy: 80, description: 'moderate lossy compression' },
      { level: 3, lossy: 110, description: 'medium lossy compression' },
      { level: 3, lossy: 140, description: 'aggressive lossy compression' }
    )
  }

  // Phase 2: Introduce scaling early with moderate lossy (medium files)
  if (startPhase <= 2) {
    compressionStrategies.push(
      { level: 3, lossy: 140, scale: 0.95, description: '95% scale + aggressive lossy' },
      { level: 3, lossy: 170, scale: 0.95, description: '95% scale + heavy lossy' },
      { level: 3, lossy: 170, scale: 0.9, description: '90% scale + heavy lossy' },
      { level: 3, lossy: 200, scale: 0.9, description: '90% scale + very heavy lossy' },
      { level: 3, lossy: 200, scale: 0.85, description: '85% scale + very heavy lossy' },
      { level: 3, lossy: 230, scale: 0.85, description: '85% scale + extreme lossy' },
      { level: 3, lossy: 230, scale: 0.8, description: '80% scale + extreme lossy' },
      { level: 3, lossy: 260, scale: 0.8, description: '80% scale + ultra extreme lossy' },
      { level: 3, lossy: 260, scale: 0.75, description: '75% scale + ultra extreme lossy' },
      { level: 3, lossy: 290, scale: 0.75, description: '75% scale + maximum lossy' }
    )
  }

  // Phase 3: Aggressive scaling (start here for large files 20MB+)
  if (startPhase <= 3) {
    compressionStrategies.push(
      { level: 3, lossy: 290, scale: 0.7, description: '70% scale + maximum lossy' },
      { level: 3, lossy: 320, scale: 0.7, description: '70% scale + extreme maximum lossy' },
      { level: 3, lossy: 350, scale: 0.65, description: '65% scale + ultra maximum lossy' },
      { level: 3, lossy: 380, scale: 0.65, description: '65% scale + extreme ultra lossy' },
      { level: 3, lossy: 400, scale: 0.6, description: '60% scale + ultimate lossy' },
      { level: 3, lossy: 450, scale: 0.6, description: '60% scale + extreme ultimate lossy' },
      { level: 3, lossy: 450, scale: 0.55, description: '55% scale + extreme ultimate lossy' },
      { level: 3, lossy: 500, scale: 0.55, description: '55% scale + maximum ultimate lossy' }
    )
  }

  // Phase 4: Nuclear option (maximum destruction) - 100 increment steps
  // Always included for all files (files >= 30MB start here)
  compressionStrategies.push(
    { level: 3, lossy: 500, scale: 0.5, description: '50% scale + maximum ultimate lossy' },
    { level: 3, lossy: 600, scale: 0.5, description: '50% scale + extreme nuclear lossy' },
    { level: 3, lossy: 700, scale: 0.45, description: '45% scale + ultimate nuclear lossy' },
    { level: 3, lossy: 800, scale: 0.4, description: '40% scale + maximum nuclear destruction' },
    { level: 3, lossy: 900, scale: 0.35, description: '35% scale + extreme nuclear destruction' },
    { level: 3, lossy: 1000, scale: 0.3, description: '30% scale + ultimate nuclear destruction' },
    { level: 3, lossy: 1100, scale: 0.25, description: '25% scale + maximum ultimate destruction' },
    { level: 3, lossy: 1200, scale: 0.2, description: '20% scale + extreme ultimate destruction' }
  )

  let bestFile = file
  let iterations = 0
  let hasUnderTargetResult = false

  for (const { level, lossy, scale, description } of compressionStrategies) {
    iterations++
    console.log(`[compressGIF] Trying ${description} (O${level}, lossy=${lossy}${scale ? `, scale=${scale}` : ''})`)

    try {
      onProgress?.(Math.round(10 + (iterations / compressionStrategies.length) * 70))

      // Build command with minimal parameters for speed and quality
      let command = `-O${level} --lossy=${lossy}`

      if (scale) {
        command += ` --scale=${scale}`
      }

      // Add multi-threading for better performance
      command += ' --threads=4'

      command += ' input.gif -o /out/output.gif'

      const result = await gifsicle.run({
        input: [{
          file: file,
          name: 'input.gif'
        }],
        command: [command]
      })

      if (result && result.length > 0) {
        const compressed = result[0]
        const compressedFile = new File([compressed], file.name, { type: 'image/gif' })
        console.log(`[compressGIF] ${description} compression result: ${compressed.size} bytes (target: ${targetSizeBytes})`)

        // Check if this result is under target
        if (compressed.size <= targetSizeBytes) {
          if (!hasUnderTargetResult) {
            // First under-target result - this is our best so far
            bestFile = compressedFile
            hasUnderTargetResult = true
            console.log(`[compressGIF] Found first under-target result: ${bestFile.size} bytes (${description} compression)`)
            console.log(`[compressGIF] Target achieved, stopping compression iterations`)
            break
          } else {
            // We already have an under-target result, check if this one is better (larger, closer to target)
            if (compressed.size > bestFile.size) {
              bestFile = compressedFile
              console.log(`[compressGIF] Better under-target result found: ${bestFile.size} bytes (${description} compression)`)
            }
          }
        } else {
          // Result is over target
          if (!hasUnderTargetResult) {
            // We don't have any under-target results yet, so this over-target result is our best fallback
            const currentDistance = Math.abs(compressed.size - targetSizeBytes)
            const bestDistance = Math.abs(bestFile.size - targetSizeBytes)

            if (currentDistance < bestDistance) {
              bestFile = compressedFile
              console.log(`[compressGIF] Better over-target result: ${bestFile.size} bytes (${description} compression)`)
            }
          }
          // If we already have an under-target result, we ignore over-target results
        }
      }
    } catch (error) {
      console.error(`[compressGIF] ${description} compression failed:`, error)
      continue
    }
  }

  // If we never found any results, return original file
  if (bestFile === file) {
    console.log('[compressGIF] No compression results obtained, returning original file')
    onProgress?.(90)
    return {
      file,
      wasCompressed: false,
      qualityRatio: 0,
      iterations,
      warning: `Unable to compress GIF. All compression attempts failed.`
    }
  }

  onProgress?.(90)
  const compressionRatio = 1 - (bestFile.size / file.size)
  const bestSizeMB = (bestFile.size / (1024 * 1024)).toFixed(2)
  const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)

  return {
    file: bestFile,
    wasCompressed: bestFile !== file,
    qualityRatio: compressionRatio,
    iterations,
    warning: bestFile.size > targetSizeBytes
      ? `Unable to reach target size. Best result: ${bestSizeMB} MB (target: ${targetSizeMB} MB). Consider reducing target size or using a different format.`
      : bestFile.size < targetSizeBytes * 0.8
      ? `High compression ratio (${(compressionRatio * 100).toFixed(0)}%) may significantly affect animation quality.`
      : compressionRatio > QUALITY_WARNING_THRESHOLD
      ? `Moderate compression ratio (${(compressionRatio * 100).toFixed(0)}%) may affect animation quality.`
      : undefined
  }
}

export async function compressVideo(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
  const { targetSizeBytes, onProgress } = options
  
  console.log('[compressVideo] Video compression attempted', {
    fileName: file.name,
    fileSize: file.size,
    targetSize: targetSizeBytes
  })
  
  if (file.size <= targetSizeBytes) {
    console.log('[compressVideo] Video already under target size')
    onProgress?.(100)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      file,
      wasCompressed: false,
      qualityRatio: 0,
      iterations: 0,
      warning: `Your video (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`
    }
  }

  onProgress?.(50)
  
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
  const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)
  
  return {
    file,
    wasCompressed: false,
    qualityRatio: 0,
    iterations: 0,
    warning: `Video compression is not yet implemented. Your ${fileSizeMB} MB video cannot be compressed to ${targetSizeMB} MB. Please use image or GIF files for now. Video support coming soon!`
  }
}

