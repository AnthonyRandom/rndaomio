import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { ScrambleText } from './ScrambleText'
import { ErrorModal } from './ErrorModal'
import { InfoModal } from './InfoModal'
import { Download, Link as LinkIcon, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react'
import { formatBytes, generateId } from '@/lib/utils'
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/lib/animationConstants'

interface MediaInfo {
  title: string
  duration: number
  thumbnail: string
  uploader: string
  description: string
  formats: number
  extractor: string
  filesize: number
  ext: string
}

interface DownloadedMedia {
  id: string
  title: string
  url: string
  fileSize: number
  timestamp: Date
  downloadUrl: string
}

interface MediaDownloaderProps {
  isLoaded: boolean
}

const DOWNLOADING_QUIPS = [
  'FETCHING MEDIA',
  'ANALYZING URL',
  'EXTRACTING CONTENT',
  'DOWNLOADING FILE',
  'PROCESSING MEDIA',
  'RETRIEVING DATA',
  'CAPTURING CONTENT',
  'ACQUIRING MEDIA',
]

const EXAMPLE_URLS = [
  // Original 8
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://x.com/user/status/1234567890',
  'https://instagram.com/p/ABC123DEF456',
  'https://tiktok.com/@user/video/1234567890',
  'https://reddit.com/r/videos/comments/abc123',
  'https://vimeo.com/123456789',
  'https://twitch.tv/videos/1234567890',
  'https://soundcloud.com/artist/track-name',
  // Additional platforms
  'https://facebook.com/watch?v=123456789',
  'https://dailymotion.com/video/x8abcd1',
  'https://streamable.com/abc123',
  'https://imgur.com/gallery/abc123def',
  'https://bilibili.com/video/BV1xx411x7xD',
  'https://bsky.app/profile/user.bsky.social/post/abc123',
  'https://loom.com/share/abc123def456',
  'https://ok.ru/video/123456789',
  'https://pinterest.com/pin/123456789/',
  'https://newgrounds.com/art/view/artist/art-name',
  'https://rutube.ru/video/abc123def456',
  'https://snapchat.com/add/username',
  'https://tumblr.com/blog/username/123456789',
  'https://vk.com/video-123456789_456123',
  'https://xiaohongshu.com/discovery/item/abc123def',
  'https://bandcamp.com/track/song-name',
  'https://mixcloud.com/artist/track-name',
  'https://threads.net/@username/post/abc123',
  'https://mastodon.social/@user/123456789',
  'https://9gag.com/gag/abc123def',
  'https://deviantart.com/art/artwork-name-123456789',
  'https://flickr.com/photos/username/123456789',
]

export function MediaDownloader({ isLoaded }: MediaDownloaderProps) {
  const [url, setUrl] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isFetchingInfo, setIsFetchingInfo] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null)
  const [downloadedMedia, setDownloadedMedia] = useState<DownloadedMedia | null>(null)
  const [history, setHistory] = useState<DownloadedMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [downloadMessage, setDownloadMessage] = useState('DOWNLOADING')
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [validationError, setValidationError] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  })
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info';
    details?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    details: []
  })

  const downloadedBlobRef = useRef<string | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const quipIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isServerOnline, setIsServerOnline] = useState(true)

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
    const interval = setInterval(checkServer, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (quipIntervalRef.current) {
        clearInterval(quipIntervalRef.current)
      }
      if (downloadedBlobRef.current) {
        URL.revokeObjectURL(downloadedBlobRef.current)
      }
    }
  }, [])

  // Cycle through placeholder URLs
  useEffect(() => {
    if (url) return // Don't cycle if user has entered a URL

    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_URLS.length)
    }, 2500) // Change every 2.5 seconds

    return () => clearInterval(interval)
  }, [url])

  const validateUrl = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setError(null)
    setMediaInfo(null)
  }

  const handleClear = () => {
    setUrl('')
    setError(null)
    setMediaInfo(null)
    setDownloadedMedia(null)
    setProgress(0)
  }

  const fetchMediaInfo = async () => {
    if (!url.trim()) {
      setValidationError({
        isOpen: true,
        message: 'Please enter a valid URL'
      })
      return
    }

    if (!validateUrl(url)) {
      setValidationError({
        isOpen: true,
        message: 'Invalid URL format. Please enter a complete URL including http:// or https://'
      })
      return
    }

    if (!isServerOnline) {
      setValidationError({
        isOpen: true,
        message: 'Server is currently offline. Please ensure the server is running and try again.'
      })
      return
    }

    setIsFetchingInfo(true)
    setError(null)

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch media information')
      }

      const info = await response.json()
      setMediaInfo(info)

    } catch (error) {
      console.error('[MediaDownloader] Failed to fetch info:', error)
      setValidationError({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Failed to fetch media information. The URL may not be supported.'
      })
    } finally {
      setIsFetchingInfo(false)
    }
  }

  const downloadMedia = async () => {
    if (!url.trim()) {
      setValidationError({
        isOpen: true,
        message: 'Please enter a valid URL'
      })
      return
    }

    if (!validateUrl(url)) {
      setValidationError({
        isOpen: true,
        message: 'Invalid URL format. Please enter a complete URL including http:// or https://'
      })
      return
    }

    if (!isServerOnline) {
      setValidationError({
        isOpen: true,
        message: 'Server is currently offline. Please ensure the server is running and try again.'
      })
      return
    }

    setIsDownloading(true)
    setProgress(1)
    setError(null)
    setDownloadedMedia(null)

    let currentProgress = 1
    let isComplete = false

    let quipIndex = 0
    setDownloadMessage(DOWNLOADING_QUIPS[0])

    quipIntervalRef.current = setInterval(() => {
      quipIndex = (quipIndex + 1) % DOWNLOADING_QUIPS.length
      setDownloadMessage(DOWNLOADING_QUIPS[quipIndex])
    }, 2500)

    progressIntervalRef.current = setInterval(() => {
      if (isComplete) return

      if (currentProgress < 90) {
        currentProgress += Math.random() * 2 + 0.5
      } else if (currentProgress < 99) {
        currentProgress += Math.random() * 0.3 + 0.1
      }

      if (currentProgress > 99) currentProgress = 99

      setProgress(Math.floor(currentProgress))
    }, 400)

    try {
      const xhr = new XMLHttpRequest()

      const timeoutDuration = 5 * 60 * 1000 // 5 minutes
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
        setIsDownloading(false)
        setValidationError({
          isOpen: true,
          message: 'Download timed out. The media may be too large or unavailable.'
        })
      }, timeoutDuration)

      xhr.addEventListener('load', async () => {
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

        if (xhr.status === 200) {
          try {
            const responseBlob = xhr.response
            const contentDisposition = xhr.getResponseHeader('Content-Disposition')
            const fileSize = parseInt(xhr.getResponseHeader('X-File-Size') || '0')

            let filename = 'download'
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
              if (filenameMatch) {
                filename = filenameMatch[1]
              }
            }

            setProgress(100)

            if (downloadedBlobRef.current) {
              URL.revokeObjectURL(downloadedBlobRef.current)
            }

            const downloadUrl = URL.createObjectURL(responseBlob)
            downloadedBlobRef.current = downloadUrl

            const downloaded: DownloadedMedia = {
              id: generateId(),
              title: mediaInfo?.title || filename,
              url: url,
              fileSize: fileSize,
              timestamp: new Date(),
              downloadUrl,
            }

            setDownloadedMedia(downloaded)
            setHistory(prev => [downloaded, ...prev])
            setIsDownloading(false)

          } catch (parseError) {
            console.error('[MediaDownloader] Failed to parse response:', parseError)
            setIsDownloading(false)
            setError('Failed to process server response')
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText)
            setIsDownloading(false)

            let userMessage = errorData.error || 'Download failed'

            setValidationError({
              isOpen: true,
              message: userMessage
            })
          } catch {
            setIsDownloading(false)
            const statusMessages: { [key: number]: string } = {
              400: 'Invalid URL or request. Please check your URL and try again.',
              500: 'Server error occurred during download. The media may not be available.',
              503: 'Server is currently unavailable. Please try again later.'
            }
            setValidationError({
              isOpen: true,
              message: statusMessages[xhr.status] || `Download failed (Error ${xhr.status}). Please try again.`
            })
          }
        }
      })

      xhr.addEventListener('error', () => {
        console.error('[MediaDownloader] Download error')
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
        setIsDownloading(false)
        setValidationError({
          isOpen: true,
          message: 'Network error occurred. Please check your internet connection and ensure the server is running.'
        })
      })

      xhr.addEventListener('abort', () => {
        console.log('[MediaDownloader] Download aborted')
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
        setIsDownloading(false)
      })

      xhr.open('POST', '/api/download')
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.responseType = 'blob'
      xhr.send(JSON.stringify({ url, format: 'best' }))

    } catch (error) {
      console.error('[MediaDownloader] Download failed:', error)
      isComplete = true

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (quipIntervalRef.current) {
        clearInterval(quipIntervalRef.current)
        quipIntervalRef.current = null
      }
      setIsDownloading(false)
      setValidationError({
        isOpen: true,
        message: error instanceof Error ? error.message : 'Download failed. Please try again.'
      })
    }
  }

  return (
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
                <Download className="h-6 w-6" />
              </motion.div>
              {!isLoaded ? (
                <ScrambleText text="MEDIA DOWNLOADER" delay={1500} scrambleSpeed={12} revealSpeed={20} />
              ) : (
                'MEDIA DOWNLOADER'
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
              {!isLoaded ? (
                <ScrambleText text="DOWNLOAD FROM MULTIPLE PLATFORMS" delay={1600} scrambleSpeed={12} revealSpeed={18} />
              ) : (
                'DOWNLOAD FROM MULTIPLE PLATFORMS'
              )}
            </p>
          </motion.div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                MEDIA URL
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                
                {/* Animated placeholder */}
                {!url && (
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none z-20 right-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPlaceholderIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.6, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="text-muted-foreground text-base truncate"
                      >
                        {EXAMPLE_URLS[currentPlaceholderIndex]}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}

                <input
                  type="text"
                  value={url}
                  onChange={handleUrlChange}
                  className={`w-full h-14 pl-14 pr-4 border-4 border-border text-foreground font-bold tracking-wider focus:border-accent focus:outline-none transition-colors ${
                    url ? 'bg-background' : 'bg-transparent'
                  }`}
                  disabled={isDownloading}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
                SUPPORTS 30+ PLATFORMS — YOUTUBE, TWITTER, INSTAGRAM, TIKTOK & MORE
              </p>
            </div>

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
                    The download server is currently unavailable. Please ensure the server is running.
                  </motion.p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border-4 border-red-500 bg-red-500/10 p-4 flex items-start gap-3 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-red-500 opacity-0"
                  animate={{ opacity: [0, 0.05, 0] }}
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
                    ERROR
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
            )}

            {mediaInfo && !downloadedMedia && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING_CONFIGS.success}
                className="border-4 border-accent bg-accent/10 p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-accent">
                  <Info className="h-5 w-5" />
                  <span className="font-bold uppercase tracking-wider">MEDIA INFO</span>
                </div>

                <div className="grid gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground uppercase text-xs mb-1">TITLE</p>
                    <p className="font-bold">{mediaInfo.title}</p>
                  </div>
                  {mediaInfo.uploader && (
                    <div>
                      <p className="text-muted-foreground uppercase text-xs mb-1">UPLOADER</p>
                      <p className="font-bold">{mediaInfo.uploader}</p>
                    </div>
                  )}
                  {mediaInfo.filesize > 0 && (
                    <div>
                      <p className="text-muted-foreground uppercase text-xs mb-1">SIZE</p>
                      <p className="font-bold">{formatBytes(mediaInfo.filesize)}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {url && !downloadedMedia && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex gap-3"
              >
                {!mediaInfo && (
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={fetchMediaInfo}
                      disabled={isDownloading || isFetchingInfo}
                      className="w-full relative overflow-hidden"
                      size="lg"
                      variant="outline"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isFetchingInfo && <Loader2 className="h-5 w-5 animate-spin" />}
                        {isFetchingInfo ? 'FETCHING INFO...' : 'GET INFO'}
                      </span>
                    </Button>
                  </motion.div>
                )}

                <motion.div
                  className="flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={downloadMedia}
                    disabled={isDownloading || isFetchingInfo}
                    className="w-full relative overflow-hidden"
                    size="lg"
                  >
                    <AnimatePresence mode="wait">
                      {!isDownloading && (
                        <motion.div
                          className="absolute inset-0 bg-accent opacity-0"
                          animate={{ opacity: [0, 0.3, 0] }}
                          transition={{ duration: ANIMATION_DURATIONS.verySlow, repeat: Infinity }}
                        />
                      )}
                    </AnimatePresence>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <motion.span
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: ANIMATION_DURATIONS.medium, repeat: Infinity }}
                          >
                            DOWNLOADING...
                          </motion.span>
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          DOWNLOAD
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {isDownloading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between text-sm font-bold uppercase">
                  <motion.span
                    key={downloadMessage}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {downloadMessage}
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

            {downloadedMedia && (
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
                      text="DOWNLOAD COMPLETE"
                      delay={200}
                      scrambleSpeed={15}
                      revealSpeed={25}
                    />
                  </motion.span>
                </div>

                <motion.div
                  className="grid gap-3 text-sm relative z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div>
                    <p className="text-muted-foreground uppercase text-xs mb-1">
                      <ScrambleText text="TITLE" delay={300} scrambleSpeed={12} revealSpeed={20} />
                    </p>
                    <motion.p
                      className="font-bold"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {downloadedMedia.title}
                    </motion.p>
                  </div>
                  <div>
                    <p className="text-muted-foreground uppercase text-xs mb-1">
                      <ScrambleText text="FILE SIZE" delay={350} scrambleSpeed={12} revealSpeed={20} />
                    </p>
                    <motion.p
                      className="font-bold text-accent"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <ScrambleText
                        text={formatBytes(downloadedMedia.fileSize)}
                        delay={500}
                        scrambleSpeed={10}
                        revealSpeed={30}
                      />
                    </motion.p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="relative z-10 flex gap-3"
                >
                  <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = downloadedMedia.downloadUrl
                        a.download = downloadedMedia.title
                        a.click()
                      }}
                      className="w-full"
                      size="lg"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Download className="h-5 w-5" />
                        <ScrambleText text="SAVE FILE" delay={0} />
                      </span>
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      size="lg"
                    >
                      NEW DOWNLOAD
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
                      <p className="font-bold text-sm uppercase">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatBytes(item.fileSize)}
                        <span className="mx-2">•</span>
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = item.downloadUrl
                          a.download = item.title
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

      <ErrorModal
        isOpen={validationError.isOpen}
        title="DOWNLOAD ERROR"
        message={validationError.message}
        onClose={() => {
          setValidationError({ isOpen: false, message: '' })
        }}
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
  )
}

