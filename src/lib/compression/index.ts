export { compressImage, type CompressionOptions as ImageCompressionOptions, type CompressionResult as ImageCompressionResult } from './imageCompression'
export { compressGIF, type CompressionOptions as GIFCompressionOptions, type CompressionResult as GIFCompressionResult } from './gifCompression'
export { compressVideo, type CompressionOptions as VideoCompressionOptions, type CompressionResult as VideoCompressionResult } from './videoCompression'

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
