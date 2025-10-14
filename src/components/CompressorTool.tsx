import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUploader } from './FileUploader'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ScrambleText } from './ScrambleText'
import { QualityWarningModal } from './QualityWarningModal'
import { Download, Zap, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { formatBytes, generateId } from '@/lib/utils'
import type { WorkerRequest, WorkerResponse } from '@/lib/compressionWorker'
import type { CompressionResult } from '@/lib/compressionStrategies'
import { compressGIF } from '@/lib/compressionStrategies'

const SIZE_LIMITS = {
  '10MB': 10 * 1024 * 1024,
  '50MB': 50 * 1024 * 1024,
  '500MB': 500 * 1024 * 1024,
}

const MAX_UPLOAD_SIZE = 2000 * 1024 * 1024

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetSize, setTargetSize] = useState<string>('10MB')
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compressedFile, setCompressedFile] = useState<CompressedFile | null>(null)
  const [history, setHistory] = useState<CompressedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showQualityWarning, setShowQualityWarning] = useState(false)
  const [pendingResult, setPendingResult] = useState<CompressionResult | null>(null)
  const [fileAlreadyUnderLimit, setFileAlreadyUnderLimit] = useState(false)
  const [shouldClearFile, setShouldClearFile] = useState(false)
  
  const workerRef = useRef<Worker | null>(null)
  const compressedBlobRef = useRef<string | null>(null)

  useEffect(() => {
    console.log('[CompressorTool] Initializing worker...')
    try {
      workerRef.current = new Worker(
        new URL('../lib/compressionWorker.ts', import.meta.url),
        { type: 'module' }
      )

      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        console.log('[CompressorTool] Worker message:', event.data)
        const { type, progress: workerProgress, result, error: workerError } = event.data

        if (type === 'progress' && workerProgress !== undefined) {
          setProgress(workerProgress)
        } else if (type === 'complete' && result) {
          handleCompressionComplete(result)
        } else if (type === 'error' || type === 'validation_error') {
          setIsCompressing(false)
          setError(workerError || 'Compression failed')
        }
      }

      workerRef.current.onerror = (error) => {
        console.error('[CompressorTool] Worker error:', error)
        setIsCompressing(false)
        setError(`Worker error: ${error.message}`)
      }

      console.log('[CompressorTool] Worker initialized successfully')
    } catch (error) {
      console.error('[CompressorTool] Failed to initialize worker:', error)
      setError(`Failed to initialize compression: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return () => {
      console.log('[CompressorTool] Cleaning up worker')
      workerRef.current?.terminate()
      if (compressedBlobRef.current) {
        URL.revokeObjectURL(compressedBlobRef.current)
      }
    }
  }, [])

  // Re-validate file when target size changes
  useEffect(() => {
    if (selectedFile && !isCompressing && !compressedFile) {
      const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2)
      const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)

      // Check if file is already under target size
      if (selectedFile.size <= targetSizeBytes) {
        if (selectedFile.type.startsWith('video/')) {
          setError(`Your video (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed, but you can still download it.`)
        } else {
          setError(`Your ${selectedFile.type.startsWith('image/gif') ? 'GIF' : 'image'} (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`)
        }
        setFileAlreadyUnderLimit(true)
      } else {
        // File needs compression
        setFileAlreadyUnderLimit(false)
        if (selectedFile.type.startsWith('video/')) {
          setError(`Video compression is not yet implemented. Your ${fileSizeMB} MB video cannot be compressed to ${targetSizeMB} MB. Please use image or GIF files for now. Video support coming soon!`)
        } else {
          setError(null)
        }
      }
    }
  }, [targetSize, selectedFile, isCompressing, compressedFile])

  const handleFileSelect = async (file: File) => {
    console.log('[CompressorTool] File selected:', file.name, file.type, file.size)
    setSelectedFile(file)
    setCompressedFile(null)
    setProgress(0)
    setError(null)
    setFileAlreadyUnderLimit(false)
    setShouldClearFile(false)

    // Immediate validation after file selection
    const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const targetSizeMB = (targetSizeBytes / (1024 * 1024)).toFixed(0)

    // Check if file is already under target size
    if (file.size <= targetSizeBytes) {
      if (file.type.startsWith('video/')) {
        setError(`Your video (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed, but you can still download it.`)
      } else {
        setError(`Your ${file.type.startsWith('image/gif') ? 'GIF' : 'image'} (${fileSizeMB} MB) is already under the ${targetSizeMB} MB limit. No compression needed!`)
      }
      setFileAlreadyUnderLimit(true)
      return
    }

    // Check file type and show warnings for files that need compression but can't be compressed
    if (file.type.startsWith('video/')) {
      setError(`Video compression is not yet implemented. Your ${fileSizeMB} MB video cannot be compressed to ${targetSizeMB} MB. Please use image or GIF files for now. Video support coming soon!`)
    } else if (file.type === 'image/gif') {
      // For GIF files, calculate compression ratio and show quality warning upfront
      const compressionRatioNeeded = 1 - (targetSizeBytes / file.size)
      if (compressionRatioNeeded > 0.7) {
        // Show quality warning immediately for high compression ratios
        setPendingResult({
          file,
          wasCompressed: false,
          qualityRatio: compressionRatioNeeded,
          iterations: 0,
          warning: `This GIF requires ${(compressionRatioNeeded * 100).toFixed(1)}% size reduction to reach ${targetSizeMB} MB. High compression ratios may significantly affect animation quality.`
        })
        setShowQualityWarning(true)
      }
    }
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

    // Show quality warning for high compression ratios (but not for GIFs where we already warned upfront)
    const isGifFile = selectedFile?.type === 'image/gif'
    const alreadyWarnedForGif = isGifFile && qualityRatio > 0.7

    if (qualityRatio > 0.7 && !result.warning?.includes('Unable to reach') && !alreadyWarnedForGif) {
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

    setIsCompressing(true)
    setProgress(0)
    setError(null)

    const targetSizeBytes = SIZE_LIMITS[targetSize as keyof typeof SIZE_LIMITS]

    // Handle GIF files on main thread (gifsicle-wasm-browser needs DOM access)
    if (selectedFile.type === 'image/gif') {
      console.log('[CompressorTool] Compressing GIF on main thread')

      try {
        const result = await compressGIF(selectedFile, {
          targetSizeBytes,
          onProgress: (progress) => {
            console.log('[CompressorTool] GIF compression progress:', progress)
            setProgress(progress)
          }
        })

        console.log('[CompressorTool] GIF compression complete:', result)
        setProgress(100)
        handleCompressionComplete(result)
      } catch (error) {
        console.error('[CompressorTool] GIF compression failed:', error)
        setIsCompressing(false)
        setError('GIF compression failed. Please try again.')
      }
      return
    }

    // Handle other file types with worker
    if (!workerRef.current) {
      console.warn('[CompressorTool] Missing worker for non-GIF file')
      return
    }

    const message: WorkerRequest = {
      type: 'compress',
      file: selectedFile,
      targetSizeBytes,
    }

    console.log('[CompressorTool] Sending message to worker:', {
      type: message.type,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      targetSizeBytes
    })

    workerRef.current.postMessage(message)
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
    <div className="space-y-8">
      <div className="border-4 border-border bg-card/50 p-8">
        <div className="space-y-6">
          <motion.div 
            className="border-b-2 border-border pb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -5, 5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5, delay: 0.5 }}
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
            />

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
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </AnimatePresence>
                    <span className="relative z-10">
                      {isCompressing ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
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
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  >
                    COMPRESSING
                  </motion.span>
                  <motion.span
                    className="tabular-nums"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  >
                    {progress}%
                  </motion.span>
                </div>
                <motion.div
                  animate={{ opacity: [1, 0.8, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Progress value={progress} className="relative overflow-hidden" />
                </motion.div>
              </motion.div>
            )}

            {compressedFile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 12 }}
                className="border-4 border-accent bg-accent/10 p-6 space-y-4 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-accent opacity-0"
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="flex items-center gap-2 text-accent relative z-10">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 360]
                    }}
                    transition={{ duration: 0.6 }}
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
                        a.download = `compressed_${compressedFile.originalName}`
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
                whileHover={{ x: 4, transition: { duration: 0.1 } }}
                className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors relative overflow-hidden"
              >
                <motion.div
                  className="absolute left-0 top-0 h-full w-1 bg-accent opacity-0"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm uppercase">{item.originalName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatBytes(item.originalSize)} → {formatBytes(item.compressedSize)} 
                      <motion.span 
                        className="ml-2 text-accent inline-block"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
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
    </div>
  )
}

