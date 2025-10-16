import { fileTypeFromBuffer } from 'file-type'

const BLOCKED_EXTENSIONS = [
  'exe', 'msi', 'zip', 'rar', '7z', 'dmg', 'pkg', 'deb', 'apk',
  'jar', 'dll', 'tar', 'gz', 'bz2', 'xz', 'iso', 'bin', 'bat',
  'cmd', 'sh', 'app', 'com', 'scr', 'vbs', 'js', 'jse',
  // Security risks
  'ipa',
  // Database files
  'db', 'sqlite', 'mdb', 'accdb',
  // DRM/Protected
  'm4p', 'vob',
  // Complex/Proprietary
  'cr2', 'nef', 'arw', 'psd', 'ai', 'blend', 'fbx', 'obj', 'stl', 'indd',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'
]

const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-bzip2',
  'application/x-executable',
  'application/x-sharedlib',
  'application/java-archive',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg'
]

const ALLOWED_CATEGORIES = {
  image: [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/avif', 
    'image/tiff',
    'image/gif'
  ],
  video: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska',
    'video/x-flv',
    'video/mp2t',
    'video/x-ms-wmv',
    'video/3gpp',
    'video/3gpp2'
  ]
}

export interface ValidationResult {
  isValid: boolean
  category?: 'image' | 'video'
  mimeType?: string
  error?: string
}

export async function validateFile(file: File): Promise<ValidationResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  
  if (BLOCKED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type ".${fileExtension}" is not allowed for security reasons.`
    }
  }

  try {
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    const fileType = await fileTypeFromBuffer(uint8Array)
    
    if (!fileType) {
      return {
        isValid: false,
        error: 'Unable to determine file type. The file may be corrupted or unsupported.'
      }
    }

    if (BLOCKED_MIME_TYPES.includes(fileType.mime)) {
      return {
        isValid: false,
        error: `File type "${fileType.mime}" is not allowed for compression.`
      }
    }

    for (const [category, mimeTypes] of Object.entries(ALLOWED_CATEGORIES)) {
      if (mimeTypes.includes(fileType.mime)) {
        return {
          isValid: true,
          category: category as 'image' | 'video',
          mimeType: fileType.mime
        }
      }
    }

    return {
      isValid: false,
      error: `Unsupported file type "${fileType.mime}". Only images and videos are supported.`
    }
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export function formatFileType(category: string): string {
  const labels: Record<string, string> = {
    image: 'Image',
    video: 'Video'
  }
  return labels[category] || 'Unknown'
}

