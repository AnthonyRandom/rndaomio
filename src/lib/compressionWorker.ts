import { validateFile } from './fileValidator'
import { compressImage, compressGIF, compressVideo, type CompressionResult } from './compressionStrategies'

export interface WorkerRequest {
  type: 'compress'
  file: File
  targetSizeBytes: number
}

export interface WorkerResponse {
  type: 'progress' | 'complete' | 'error' | 'validation_error'
  progress?: number
  result?: CompressionResult
  error?: string
}

console.log('[Worker] Compression worker loaded')

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  console.log('[Worker] Received message:', event.data)
  const { type, file, targetSizeBytes } = event.data

  if (type !== 'compress') {
    console.warn('[Worker] Unknown message type:', type)
    return
  }

  try {
    console.log('[Worker] Starting compression for:', file.name, 'Size:', file.size, 'Target:', targetSizeBytes)
    postMessage({ type: 'progress', progress: 5 } as WorkerResponse)

    console.log('[Worker] Validating file...')
    const validation = await validateFile(file)
    console.log('[Worker] Validation result:', validation)

    if (!validation.isValid) {
      console.error('[Worker] Validation failed:', validation.error)
      postMessage({
        type: 'validation_error',
        error: validation.error || 'File validation failed'
      } as WorkerResponse)
      return
    }

    postMessage({ type: 'progress', progress: 10 } as WorkerResponse)

    let result: CompressionResult

    const onProgress = (progress: number) => {
      console.log('[Worker] Progress:', progress)
      postMessage({ type: 'progress', progress } as WorkerResponse)
    }

    console.log('[Worker] Starting compression for category:', validation.category)
    switch (validation.category) {
      case 'image':
        result = await compressImage(file, { targetSizeBytes, onProgress })
        break
      case 'gif':
        result = await compressGIF(file, { targetSizeBytes, onProgress })
        break
      case 'video':
        result = await compressVideo(file, { targetSizeBytes, onProgress })
        break
      default:
        throw new Error(`Unsupported file category: ${validation.category}`)
    }

    console.log('[Worker] Compression complete:', result)
    postMessage({ type: 'progress', progress: 100 } as WorkerResponse)
    postMessage({ type: 'complete', result } as WorkerResponse)
  } catch (error) {
    console.error('[Worker] Compression error:', error)
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Compression failed'
    } as WorkerResponse)
  }
}

export {}

