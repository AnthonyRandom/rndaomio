import imageCompression from 'browser-image-compression'

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
