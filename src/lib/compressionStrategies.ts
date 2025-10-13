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
  let quality = 0.95
  let iterations = 0
  const qualityStep = 0.1

  while (iterations < MAX_ITERATIONS && quality >= MIN_QUALITY) {
    iterations++
    console.log(`[compressImage] Iteration ${iterations}, quality: ${quality}`)
    
    try {
      const progressBase = 10 + (iterations / MAX_ITERATIONS) * 70
      
      console.log('[compressImage] Calling imageCompression library...')
      const compressed = await imageCompression(file, {
        maxSizeMB: targetSizeBytes / (1024 * 1024),
        initialQuality: quality,
        useWebWorker: false,
        onProgress: (p) => {
          onProgress?.(progressBase + (p / 100) * (70 / MAX_ITERATIONS))
        }
      })

      console.log(`[compressImage] Compressed to ${compressed.size} bytes (target: ${targetSizeBytes})`)

      if (compressed.size <= targetSizeBytes) {
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

      if (compressed.size < bestFile.size) {
        bestFile = new File([compressed], file.name, { type: file.type })
        console.log(`[compressImage] New best size: ${bestFile.size} bytes`)
      }

      quality -= qualityStep
    } catch (error) {
      console.error('[compressImage] Iteration failed:', error)
      break
    }
  }

  onProgress?.(90)
  const compressionRatio = 1 - (bestFile.size / file.size)
  
  return {
    file: bestFile,
    wasCompressed: bestFile !== file,
    qualityRatio: compressionRatio,
    iterations,
    warning: bestFile.size > targetSizeBytes
      ? `Unable to reach target size. Compressed to ${(bestFile.size / (1024 * 1024)).toFixed(2)} MB with maximum quality reduction.`
      : compressionRatio > QUALITY_WARNING_THRESHOLD
      ? `High compression ratio (${(compressionRatio * 100).toFixed(0)}%) may result in visible quality loss.`
      : undefined
  }
}

export async function compressGIF(
  file: File,
  options: CompressionOptions
): Promise<CompressionResult> {
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

  onProgress?.(50)

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: targetSizeBytes / (1024 * 1024),
      initialQuality: 0.8,
      useWebWorker: false
    })

    onProgress?.(90)
    
    const compressedFile = new File([compressedBlob], file.name, { type: 'image/gif' })
    const compressionRatio = 1 - (compressedFile.size / file.size)

    if (compressedFile.size > targetSizeBytes) {
      return {
        file: compressedFile,
        wasCompressed: true,
        qualityRatio: compressionRatio,
        iterations: 1,
        warning: `Unable to reach target size. GIF compressed to ${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB. Consider converting to video format for better compression.`
      }
    }

    return {
      file: compressedFile,
      wasCompressed: true,
      qualityRatio: compressionRatio,
      iterations: 1,
      warning: compressionRatio > QUALITY_WARNING_THRESHOLD
        ? `High compression ratio (${(compressionRatio * 100).toFixed(0)}%) may affect animation quality.`
        : undefined
    }
  } catch (error) {
    onProgress?.(90)
    return {
      file,
      wasCompressed: false,
      qualityRatio: 0,
      iterations: 0,
      warning: `GIF compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
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

