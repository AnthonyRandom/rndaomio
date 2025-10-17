import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { FileUploader } from './FileUploader'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ScrambleText } from './ScrambleText'
import { QualityWarningModal } from './QualityWarningModal'
import { InfoModal } from './InfoModal'
import { ErrorModal } from './ErrorModal'
import { Download, Zap, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { formatBytes, generateId, formatFileSizeMB, getTargetSizeMB, isFileAlreadyUnderLimit } from '@/lib/utils'
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/lib/animationConstants'
import { validateFile } from '@/lib/fileValidator'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { useCompressionSettingsContext } from '@/lib/CompressionSettingsContext'

interface CompressionResult {
  file: File
  wasCompressed: boolean
  qualityRatio: number
  iterations: number
  warning?: string
}

const SIZE_LIMITS = {
  '10MB': 10 * 1024 * 1024,
  '50MB': 50 * 1024 * 1024,
  '500MB': 500 * 1024 * 1024,
}

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024

const UPLOAD_QUIPS = [
  'UPLOADING FILE',
  'TRANSFERRING DATA',
  'SENDING TO SERVER',
  'PREPARING FILE',
]

const COMPRESSION_QUIPS = [
  'SQUEEZING PIXELS',
  'NEGOTIATING WITH BYTES',
  'APPLYING COMPRESSION MAGIC',
  'OPTIMIZING QUALITY',
  'FINDING THE SWEET SPOT',
  'BINARY SEARCH IN PROGRESS',
  'TESTING COMPRESSION LEVELS',
  'CALCULATING OPTIMAL QUALITY',
  'SHRINKING RESPONSIBLY',
  'REDUCING FILE SIZE',
  'ANALYZING COMPRESSION RATIO',
  'BALANCING QUALITY VS SIZE',
  'RUNNING LOSSY ALGORITHMS',
  'EXTRAPOLATING RESULTS',
  'ADJUSTING PARAMETERS',
  'COMPRESSING FRAMES',
  'OPTIMIZING COLOR PALETTE',
  'MINIMIZING REDUNDANCY',
]

const FINISHING_QUIPS = [
  'ALMOST THERE',
  'FINALIZING COMPRESSION',
  'WRAPPING UP',
  'FINAL TOUCHES',
  'PACKAGING RESULTS',
  'PREPARING DOWNLOAD',
]

interface CompressedFile {
  id: string
  originalName: string
  originalSize: number
  compressedSize: number
  timestamp: Date
  downloadUrl: string
}

interface CompressorToolProps {
  isLoaded: boolean
}

export function CompressorTool({ isLoaded }: CompressorToolProps) {
  const { settings } = useAppearanceContext()
  const { settings: compressionSettings } = useCompressionSettingsContext()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetSize, setTargetSize] = useState<string>(compressionSettings.defaultTargetSize)
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compressedFile, setCompressedFile] = useState<CompressedFile | null>(null)
  const [history, setHistory] = useState<CompressedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showQualityWarning, setShowQualityWarning] = useState(false)
  const [pendingResult, setPendingResult] = useState<CompressionResult | null>(null)
  const [fileAlreadyUnderLimit, setFileAlreadyUnderLimit] = useState(false)
  const [shouldClearFile, setShouldClearFile] = useState(false)
  const [compressionMessage, setCompressionMessage] = useState('COMPRESSING')
  const [validationError, setValidationError] = useState<{ isOpen: boolean; message: string }>({ 
    isOpen: false, 
    message: '' 
  })
  const [largeFileWarning, setLargeFileWarning] = useState<{ 
    isOpen: boolean; 
    file: File | null;
    estimatedTime: string;
  }>({ 
    isOpen: false, 
    file: null,
    estimatedTime: ''
  })
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'audio-muted' | 'resolution-reduced';
    details?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    details: []
  })
  
  const compressedBlobRef = useRef<string | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const quipIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingFileRef = useRef<File | null>(null)
  const [isServerOnline, setIsServerOnline] = useState(true)

  // Check server connectivity on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('/health', { method: 'GET' })
        setIsServerOnline(response.ok)
      } catch {
        setIsServerOnline(false)
      }
    }
    
    checkServer()
    
    // Check server every 30 seconds
    const interval = setInterval(checkServer, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (quipIntervalRef.current) {
        clearInterval(quipIntervalRef.current)
      }
    }
  }, [])

  // Re-validate file when target size changes
  useEffect(() => {
    if (selectedFile && !isCompressing && !compressedFile) {
      const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]
      const fileSizeMB = formatFileSizeMB(selectedFile.size)
      const targetSizeMB = getTargetSizeMB(targetSizeBytes)

      // Check if file is already under target size
      if (isFileAlreadyUnderLimit(selectedFile.size, targetSizeBytes)) {
        if (selectedFile.type.startsWith('video/')) {
          setError(`Your video (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed.`)
        } else {
          setError(`Your ${selectedFile.type.startsWith('image/gif') ? 'GIF' : 'image'} (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`)
        }
        setFileAlreadyUnderLimit(true)
      } else {
        // File needs compression
        setFileAlreadyUnderLimit(false)
        setError(null)
      }
    }
  }, [targetSize, selectedFile, isCompressing, compressedFile])

  const handleFileSelect = async (file: File) => {
    console.log('[CompressorTool] File selected:', file.name, file.type, file.size)
    
    // Validate file type first
    const validation = await validateFile(file)
    if (!validation.isValid) {
      setValidationError({
        isOpen: true,
        message: validation.error || 'File validation failed'
      })
      setShouldClearFile(true)
      return
    }

    // Check for large files that will take time
    const fileSizeMB = file.size / (1024 * 1024)
    const isGif = file.type === 'image/gif'
    const isVideo = file.type.startsWith('video/')
    
    let estimatedTime = ''
    let shouldWarn = false
    
    if ((isGif || isVideo) && fileSizeMB > 100) {
      estimatedTime = 'several minutes'
      shouldWarn = true
    } else if ((isGif || isVideo) && fileSizeMB > 50) {
      estimatedTime = '1-2 minutes'
      shouldWarn = true
    }

    if (shouldWarn) {
      pendingFileRef.current = file
      setLargeFileWarning({
        isOpen: true,
        file,
        estimatedTime
      })
      // Still proceed with selection so the file shows in UI
      proceedWithFileSelection(file)
      return
    }

    // Proceed with file selection
    proceedWithFileSelection(file)
  }

  const proceedWithFileSelection = (file: File) => {
    setSelectedFile(file)
    setCompressedFile(null)
    setProgress(0)
    setError(null)
    setFileAlreadyUnderLimit(false)
    setShouldClearFile(false)

    // Immediate validation after file selection
    const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]
    const fileSizeMB = formatFileSizeMB(file.size)
    const targetSizeMB = getTargetSizeMB(targetSizeBytes)

    // Check if file is already under target size
    if (isFileAlreadyUnderLimit(file.size, targetSizeBytes)) {
      if (file.type.startsWith('video/')) {
        setError(`Your video (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed.`)
      } else {
        setError(`Your ${file.type.startsWith('image/gif') ? 'GIF' : 'image'} (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`)
      }
      setFileAlreadyUnderLimit(true)
      return
    }
  }

  const handleFileClear = () => {
    setSelectedFile(null)
    setCompressedFile(null)
    setProgress(0)
    setError(null)
    setFileAlreadyUnderLimit(false)
    setShouldClearFile(false)
  }

  const handleCompressionComplete = (result: CompressionResult) => {
    console.log('[CompressorTool] handleCompressionComplete called', {
      wasCompressed: result.wasCompressed,
      warning: result.warning,
      fileSize: result.file.size
    })

    // If no compression was needed (file already under target size), just show message briefly
    if (!result.wasCompressed && result.warning?.includes('already under')) {
      setIsCompressing(false)
      // Show a brief success message instead of error
      setError(result.warning)
      // Clear the message after 3 seconds
      setTimeout(() => setError(null), 3000)
      return
    }

    // Check if this is an actual error (can't compress) vs info (already under limit)
    const isActualError = result.warning && (
      result.warning.includes('not yet implemented') ||
      result.warning.includes('compression failed') ||
      result.warning.includes('Unsupported')
    )

    if (isActualError) {
      setIsCompressing(false)
      setError(result.warning!)
      return
    }

    const qualityRatio = result.qualityRatio

    // Show quality warning for high compression ratios
    if (qualityRatio > 0.7 && !result.warning?.includes('Unable to reach')) {
      setPendingResult(result)
      setShowQualityWarning(true)
      setIsCompressing(false)
    } else if (result.warning?.includes('Unable to reach')) {
      // Show warning about unable to reach target size, but still allow download
      setError(result.warning)
      finalizeCompression(result)
    } else {
      // File was compressed successfully - show success
      finalizeCompression(result)
    }
  }

  const finalizeCompression = (result: CompressionResult) => {
    if (!selectedFile) return

    if (compressedBlobRef.current) {
      URL.revokeObjectURL(compressedBlobRef.current)
    }

    const downloadUrl = URL.createObjectURL(result.file)
    compressedBlobRef.current = downloadUrl

    const compressed: CompressedFile = {
      id: generateId(),
      originalName: selectedFile.name,
      originalSize: selectedFile.size,
      compressedSize: result.file.size,
      timestamp: new Date(),
      downloadUrl,
    }

    setCompressedFile(compressed)
    setHistory(prev => [compressed, ...prev])
    setIsCompressing(false)
    setShowQualityWarning(false)
    setPendingResult(null)

    if (result.warning) {
      setError(result.warning)
    }
  }

  const compressFile = async () => {
    console.log('[CompressorTool] compressFile called')
    console.log('[CompressorTool] selectedFile:', selectedFile)

    if (!selectedFile) {
      console.warn('[CompressorTool] Missing file')
      return
    }

    // Check server connectivity before starting
    if (!isServerOnline) {
      setValidationError({
        isOpen: true,
        message: 'Server is currently offline. Please ensure the server is running and try again.'
      })
      return
    }

    setIsCompressing(true)
    setProgress(1)
    setError(null)
    
    const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]
    let currentProgress = 1
    let currentPhase: 'upload' | 'compression' | 'finishing' = 'upload'
    let isComplete = false
    
    // Detect if file is a GIF or video for slower progress
    const isGif = selectedFile.type === 'image/gif'
    const isVideo = selectedFile.type.startsWith('video/')

    // Helper to get current quips based on phase
    const getCurrentQuips = () => {
      if (currentPhase === 'upload') return UPLOAD_QUIPS
      if (currentPhase === 'compression') return COMPRESSION_QUIPS
      return FINISHING_QUIPS
    }

    // Start with upload quips
    let quipIndex = 0
    let finishingQuipsSeen = 0
    setCompressionMessage(UPLOAD_QUIPS[0])

    // Rotate quips every 3 seconds
    quipIntervalRef.current = setInterval(() => {
      const quips = getCurrentQuips()
      
      // For finishing phase, stop rotating after showing all quips once
      if (currentPhase === 'finishing') {
        if (finishingQuipsSeen >= quips.length - 1) {
          // Keep showing the last quip
          setCompressionMessage(quips[quips.length - 1])
          return
        }
        finishingQuipsSeen++
        quipIndex = finishingQuipsSeen
        setCompressionMessage(quips[quipIndex])
      } else {
        // Normal rotation for upload and compression phases
        quipIndex = (quipIndex + 1) % quips.length
        setCompressionMessage(quips[quipIndex])
      }
    }, 3000)

    // Faux progress simulation - slower for GIFs and videos
    const progressSpeed = (isGif || isVideo) ? 800 : 300 // GIFs/videos get 800ms interval vs 300ms for images
    const compressionIncrement = (isGif || isVideo) ? 0.3 : 1.5 // Much slower increment for GIFs/videos
    
    progressIntervalRef.current = setInterval(() => {
      if (isComplete) return

      if (currentProgress < 15) {
        // Upload phase (1-15%)
        currentProgress += Math.random() * 2 + 0.5
        if (currentProgress >= 15) {
          currentPhase = 'compression'
          quipIndex = 0
          finishingQuipsSeen = 0
        }
      } else if (currentProgress < 85) {
        // Compression phase (15-85%)
        currentProgress += Math.random() * compressionIncrement + 0.3
        if (currentProgress >= 85) {
          currentPhase = 'finishing'
          quipIndex = 0
          finishingQuipsSeen = 0
        }
      } else if (currentProgress < 99) {
        // Finishing phase (85-99%)
        currentProgress += Math.random() * 0.5 + 0.1
      }

      // Cap at 99%
      if (currentProgress > 99) currentProgress = 99
      
      setProgress(Math.floor(currentProgress))
    }, progressSpeed)

    try {
      console.log('[CompressorTool] Uploading file to server...')

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('targetSizeBytes', targetSizeBytes.toString())

      const xhr = new XMLHttpRequest()
      
      // Set timeout for very large files (10 minutes)
      const timeoutDuration = 10 * 60 * 1000
      const timeoutId = setTimeout(() => {
        xhr.abort()
        isComplete = true
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (quipIntervalRef.current) {
          clearInterval(quipIntervalRef.current)
          quipIntervalRef.current = null
        }
        setIsCompressing(false)
        setValidationError({
          isOpen: true,
          message: 'Compression timed out. The file may be too large or complex. Try reducing the file size or target size first.'
        })
      }, timeoutDuration)

      xhr.addEventListener('load', async () => {
        clearTimeout(timeoutId)
        isComplete = true

        // Clear intervals
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (quipIntervalRef.current) {
          clearInterval(quipIntervalRef.current)
          quipIntervalRef.current = null
        }

        if (xhr.status === 200) {
          try {
            const responseBlob = xhr.response
            const contentDisposition = xhr.getResponseHeader('Content-Disposition')
            const originalSize = parseInt(xhr.getResponseHeader('X-Original-Size') || '0')
            const compressedSize = parseInt(xhr.getResponseHeader('X-Compressed-Size') || '0')
            const wasCompressed = xhr.getResponseHeader('X-Was-Compressed') === 'true'
            const audioMutedHeader = xhr.getResponseHeader('X-Audio-Muted')
            const audioMuted = audioMutedHeader && audioMutedHeader === 'true'
            const resolutionReduced = xhr.getResponseHeader('X-Resolution-Reduced')
            const originalResolution = xhr.getResponseHeader('X-Original-Resolution')
            const finalResolution = xhr.getResponseHeader('X-Final-Resolution')

            let filename = selectedFile.name
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
              if (filenameMatch) {
                filename = filenameMatch[1]
              }
            }

            console.log('[CompressorTool] Processing complete:', {
              originalSize,
              compressedSize,
              wasCompressed
            })

            // Jump to 100%
            setProgress(100)

            const result: CompressionResult = {
              file: new File([responseBlob], filename, { type: selectedFile.type }),
              wasCompressed,
              qualityRatio: 0,
              iterations: 0,
              warning: audioMuted ? 'The audio track was muted to meet the target size.' : undefined
            }

            // Show notifications for significant changes
            if (audioMuted && resolutionReduced) {
              setInfoModal({
                isOpen: true,
                title: 'VIDEO MODIFIED',
                message: 'Both resolution and audio were adjusted to meet your target file size.',
                type: 'resolution-reduced',
                details: [
                  `Resolution reduced: ${originalResolution} → ${finalResolution}`,
                  'Audio track was completely removed',
                  'These changes were necessary to reach the target size'
                ]
              })
            } else if (resolutionReduced) {
              setInfoModal({
                isOpen: true,
                title: 'RESOLUTION REDUCED',
                message: 'Video resolution was reduced to meet your target file size.',
                type: 'resolution-reduced',
                details: [
                  `Original resolution: ${originalResolution}`,
                  `Final resolution: ${finalResolution}`,
                  'Bitrate optimization alone was not enough to reach target size'
                ]
              })
            } else if (audioMuted) {
              setInfoModal({
                isOpen: true,
                title: 'AUDIO MUTED',
                message: 'The audio track was removed to meet your target file size.',
                type: 'audio-muted',
                details: [
                  'The video bitrate alone was not enough to reach the target size',
                  'Audio has been completely removed from the final video',
                  'Video quality has been preserved as much as possible'
                ]
              })
            }

            handleCompressionComplete(result)
          } catch (parseError) {
            console.error('[CompressorTool] Failed to parse response:', parseError)
            setIsCompressing(false)
            setError('Failed to process server response')
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText)
            setIsCompressing(false)
            
            // Provide user-friendly error messages
            let userMessage = errorData.error || 'Upload failed'
            if (userMessage.includes('not supported for compression')) {
              userMessage = `This video format is not supported. ${userMessage}`
            } else if (userMessage.includes('Unsupported file type')) {
              userMessage = 'This file type is not supported for compression. Please use images (JPEG, PNG, WebP, AVIF, TIFF, GIF) or videos (MP4, MOV, AVI, WebM, MKV).'
            } else if (userMessage.includes('fileSize')) {
              userMessage = 'File size exceeds the maximum allowed limit (2GB).'
            }
            
            setValidationError({
              isOpen: true,
              message: userMessage
            })
          } catch {
            setIsCompressing(false)
            const statusMessages: { [key: number]: string } = {
              400: 'Invalid file or request. Please check your file and try again.',
              413: 'File is too large. Maximum upload size is 2GB.',
              500: 'Server error occurred during compression. Please try again.',
              503: 'Server is currently unavailable. Please try again later.'
            }
            setValidationError({
              isOpen: true,
              message: statusMessages[xhr.status] || `Upload failed (Error ${xhr.status}). Please try again.`
            })
          }
        }
      })

      xhr.addEventListener('error', () => {
        console.error('[CompressorTool] Upload error')
        clearTimeout(timeoutId)
        isComplete = true
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (quipIntervalRef.current) {
          clearInterval(quipIntervalRef.current)
          quipIntervalRef.current = null
        }
        setIsCompressing(false)
        setValidationError({
          isOpen: true,
          message: 'Network error occurred. Please check your internet connection and ensure the server is running.'
        })
      })
      
      xhr.addEventListener('abort', () => {
        console.log('[CompressorTool] Upload aborted')
        clearTimeout(timeoutId)
        isComplete = true
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (quipIntervalRef.current) {
          clearInterval(quipIntervalRef.current)
          quipIntervalRef.current = null
        }
        setIsCompressing(false)
      })

      xhr.open('POST', '/api/compress')
      xhr.responseType = 'blob'
      xhr.send(formData)

    } catch (error) {
      console.error('[CompressorTool] Upload failed:', error)
      isComplete = true
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (quipIntervalRef.current) {
        clearInterval(quipIntervalRef.current)
        quipIntervalRef.current = null
      }
      setIsCompressing(false)
      setValidationError({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      })
    }
  }

  const handleQualityWarningProceed = () => {
    if (pendingResult) {
      // Check if we have a compressed result (after compression) or just a prediction (before compression)
      if (pendingResult.wasCompressed) {
        // After compression: finalize the result
        finalizeCompression(pendingResult)
      } else {
        // Before compression: start the compression process
        setShowQualityWarning(false)
        setPendingResult(null)
        compressFile()
      }
    }
  }

  const handleQualityWarningCancel = () => {
    setShowQualityWarning(false)
    setPendingResult(null)
    setIsCompressing(false)
    // Clear the selected file when user cancels quality warning
    setSelectedFile(null)
    setCompressedFile(null)
    setProgress(0)
    setError(null)
    setFileAlreadyUnderLimit(false)
    setShouldClearFile(true)
  }

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "never"}>
    <div className="space-y-8">
      <div className="border-4 border-border bg-card/50 p-8">
        <div className="space-y-6">
          <motion.div
            className="border-b-2 border-border pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: ANIMATION_DURATIONS.normal }}
          >
            <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -5, 5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: ANIMATION_DURATIONS.medium, delay: 0.5 }}
              >
                <Zap className="h-6 w-6" />
              </motion.div>
              {!isLoaded ? (
                <ScrambleText text="FILE COMPRESSOR" delay={1500} scrambleSpeed={12} revealSpeed={20} />
              ) : (
                'FILE COMPRESSOR'
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
              {!isLoaded ? (
                <ScrambleText text="DISCORD FILE SIZE OPTIMIZER" delay={1600} scrambleSpeed={12} revealSpeed={18} />
              ) : (
                'DISCORD FILE SIZE OPTIMIZER'
              )}
            </p>
          </motion.div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                TARGET SIZE LIMIT
              </label>
              <Select value={targetSize} onValueChange={setTargetSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10MB">10 MB - FREE TIER</SelectItem>
                  <SelectItem value="50MB">50 MB - NITRO CLASSIC</SelectItem>
                  <SelectItem value="500MB">500 MB - NITRO BOOST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FileUploader
              onFileSelect={handleFileSelect}
              maxSize={MAX_UPLOAD_SIZE}
              shouldClearFile={shouldClearFile}
              onFileClear={handleFileClear}
            />

            {!isServerOnline && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-4 border-red-500 bg-red-500/10 p-4 flex items-start gap-3 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-red-500 opacity-0"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="relative z-10"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                </motion.div>
                <div className="flex-1 relative z-10">
                  <motion.p 
                    className="text-sm font-bold uppercase text-red-500 mb-1"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    SERVER OFFLINE
                  </motion.p>
                  <motion.p 
                    className="text-sm"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    The compression server is currently unavailable. Please ensure the server is running.
                  </motion.p>
                </div>
              </motion.div>
            )}

            {error && (() => {
              const isInfo = error.includes('already under') || error.includes('No compression needed')
              const isError = error.includes('not yet implemented') || error.includes('cannot be compressed')
              
              const borderColor = isError ? 'border-red-500' : isInfo ? 'border-cyan-500' : 'border-yellow-500'
              const bgColor = isError ? 'bg-red-500/10' : isInfo ? 'bg-cyan-500/10' : 'bg-yellow-500/10'
              const textColor = isError ? 'text-red-500' : isInfo ? 'text-cyan-500' : 'text-yellow-500'
              const Icon = isInfo ? Info : AlertCircle
              const label = isError ? 'ERROR' : isInfo ? 'INFO' : 'WARNING'
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`border-4 ${borderColor} ${bgColor} p-4 flex items-start gap-3 relative overflow-hidden`}
                >
                  <motion.div
                    className={`absolute inset-0 ${isError ? 'bg-red-500' : isInfo ? 'bg-cyan-500' : 'bg-yellow-500'} opacity-0`}
                    animate={{ opacity: [0, 0.05, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative z-10"
                  >
                    <Icon className={`h-5 w-5 ${textColor} flex-shrink-0 mt-0.5`} />
                  </motion.div>
                  <div className="flex-1 relative z-10">
                    <motion.p 
                      className={`text-sm font-bold uppercase ${textColor} mb-1`}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {label}
                    </motion.p>
                    <motion.p 
                      className="text-sm"
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {error}
                    </motion.p>
                  </div>
                </motion.div>
              )
            })()}

            {selectedFile && !compressedFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={compressFile}
                    disabled={isCompressing || fileAlreadyUnderLimit || (error !== null && (error.includes('not yet implemented') || error.includes('cannot be compressed')))}
                    className="w-full relative overflow-hidden"
                    size="lg"
                  >
                    <AnimatePresence mode="wait">
                      {!isCompressing && (
                        <motion.div
                          className="absolute inset-0 bg-accent opacity-0"
                          animate={{ opacity: [0, 0.3, 0] }}
                          transition={{ duration: ANIMATION_DURATIONS.verySlow, repeat: Infinity }}
                        />
                      )}
                    </AnimatePresence>
                    <span className="relative z-10">
                      {isCompressing ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: ANIMATION_DURATIONS.medium, repeat: Infinity }}
                        >
                          PROCESSING...
                        </motion.span>
                      ) : (
                        'COMPRESS FILE'
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {isCompressing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm font-bold uppercase">
                  <motion.span
                    key={compressionMessage}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {compressionMessage}
                  </motion.span>
                  <motion.span
                    className="tabular-nums"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: ANIMATION_DURATIONS.normal, repeat: Infinity }}
                  >
                    {progress}%
                  </motion.span>
                </div>
                <motion.div
                  animate={{ opacity: [1, 0.8, 1] }}
                  transition={{ duration: ANIMATION_DURATIONS.medium, repeat: Infinity }}
                >
                  <Progress value={progress} className="relative overflow-hidden" />
                </motion.div>
              </motion.div>
            )}

            {compressedFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={SPRING_CONFIGS.success}
                className="border-4 border-accent bg-accent/10 p-6 space-y-4 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-accent opacity-0"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
                />
                <div className="flex items-center gap-2 text-accent relative z-10">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 360]
                    }}
                    transition={{ duration: ANIMATION_DURATIONS.slow }}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </motion.div>
                  <motion.span 
                    className="font-bold uppercase tracking-wider"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ScrambleText 
                      text="COMPRESSION COMPLETE" 
                      delay={200} 
                      scrambleSpeed={15} 
                      revealSpeed={25}
                    />
                  </motion.span>
                </div>
                
                <motion.div 
                  className="grid grid-cols-2 gap-4 text-sm relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div>
                    <p className="text-muted-foreground uppercase text-xs mb-1">
                      <ScrambleText text="ORIGINAL SIZE" delay={300} scrambleSpeed={12} revealSpeed={20} />
                    </p>
                    <motion.p 
                      className="font-bold"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <ScrambleText 
                        text={formatBytes(compressedFile.originalSize)} 
                        delay={400} 
                        scrambleSpeed={10} 
                        revealSpeed={30} 
                      />
                    </motion.p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase text-xs mb-1">
                      <ScrambleText text="COMPRESSED SIZE" delay={350} scrambleSpeed={12} revealSpeed={20} />
                    </p>
                    <motion.p 
                      className="font-bold text-accent"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <ScrambleText 
                        text={formatBytes(compressedFile.compressedSize)} 
                        delay={500} 
                        scrambleSpeed={10} 
                        revealSpeed={30} 
                      />
                    </motion.p>
                  </div>
                </motion.div>

                <motion.div 
                  className="pt-2 relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-xs text-muted-foreground uppercase mb-1">
                    <ScrambleText text="REDUCTION" delay={600} scrambleSpeed={12} revealSpeed={20} />
                  </p>
                  <motion.p 
                    className="text-2xl font-bold"
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, delay: 0.7 }}
                  >
                    <ScrambleText 
                      text={`${((1 - compressedFile.compressedSize / compressedFile.originalSize) * 100).toFixed(1)}%`}
                      delay={700} 
                      scrambleSpeed={8} 
                      revealSpeed={35} 
                    />
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="relative z-10"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = compressedFile.downloadUrl
                        a.download = `${compressionSettings.preserveOriginalFilenames ? '' : 'compressed_'}${compressedFile.originalName}`
                        a.click()
                      }}
                      className="w-full"
                      size="lg"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Download className="h-5 w-5" />
                        <ScrambleText text="DOWNLOAD FILE" delay={0} />
                      </span>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {history.length > 0 && (
          <motion.div 
            className="border-4 border-border bg-card/50 p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="border-b-2 border-border pb-4 mb-6">
              <h3 className="text-xl font-bold uppercase tracking-wider">
                DOWNLOAD HISTORY
              </h3>
            </div>
          
          <div className="space-y-2">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4, transition: { duration: ANIMATION_DURATIONS.fast } }}
                className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors relative overflow-hidden"
              >
                <motion.div
                  className="absolute left-0 top-0 h-full w-1 bg-accent opacity-0"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: ANIMATION_DURATIONS.fast }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm uppercase">{item.originalName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatBytes(item.originalSize)} → {formatBytes(item.compressedSize)} 
                      <motion.span
                        className="ml-2 text-accent inline-block"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity, delay: index * 0.3 }}
                      >
                        (-{((1 - item.compressedSize / item.originalSize) * 100).toFixed(0)}%)
                      </motion.span>
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = item.downloadUrl
                        a.download = `compressed_${item.originalName}`
                        a.click()
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QualityWarningModal
        isOpen={showQualityWarning}
        qualityLoss={(pendingResult?.qualityRatio || 0) * 100}
        warningMessage={
          pendingResult?.warning || 
          'The file requires significant compression to reach the target size.'
        }
        onProceed={handleQualityWarningProceed}
        onCancel={handleQualityWarningCancel}
      />

      <ErrorModal
        isOpen={validationError.isOpen}
        title="VALIDATION ERROR"
        message={validationError.message}
        onClose={() => {
          setValidationError({ isOpen: false, message: '' })
          setShouldClearFile(true)
        }}
      />

      <InfoModal
        isOpen={largeFileWarning.isOpen}
        title="LARGE FILE WARNING"
        message={`This ${largeFileWarning.file?.type.startsWith('video/') ? 'video' : 'GIF'} file is ${formatBytes(largeFileWarning.file?.size || 0)}. Compression may take ${largeFileWarning.estimatedTime}.`}
        type="info"
        details={[
          'The compression process will run in the background',
          'Progress indicator will show estimated completion'
        ]}
        onClose={() => {
          setLargeFileWarning({ isOpen: false, file: null, estimatedTime: '' })
          pendingFileRef.current = null
        }}
        proceedLabel="PROCEED ANYWAY"
      />

      <InfoModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        details={infoModal.details}
        onClose={() => setInfoModal({ 
          isOpen: false, 
          title: '', 
          message: '', 
          type: 'info',
          details: []
        })}
        proceedLabel="OK"
      />
    </div>
    </MotionConfig>
  )
}

