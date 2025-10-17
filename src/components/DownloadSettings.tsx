import { motion, MotionConfig } from 'framer-motion'
import { Video, Music, FileText, RotateCcw } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useDownloadSettingsContext } from '@/lib/DownloadSettingsContext'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { ANIMATION_DURATIONS } from '@/lib/animationConstants'
import { Button } from './ui/button'

interface DownloadSettingsProps {
  isLoaded: boolean
}

const VIDEO_QUALITIES = [
  { value: 'auto', label: 'Auto - Best Available' },
  { value: '2160p', label: '2160p (4K)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '720p', label: '720p (HD)' },
  { value: '480p', label: '480p (SD)' },
  { value: '360p', label: '360p' },
]

const VIDEO_CODECS = [
  { value: 'auto', label: 'Auto - Platform Default' },
  { value: 'h264', label: 'H.264 (AVC)' },
  { value: 'h265', label: 'H.265 (HEVC)' },
  { value: 'vp9', label: 'VP9' },
  { value: 'av1', label: 'AV1' },
]

const FILE_CONTAINERS = [
  { value: 'auto', label: 'Auto - Best Compatible' },
  { value: 'mp4', label: 'MP4' },
  { value: 'mkv', label: 'MKV' },
  { value: 'webm', label: 'WebM' },
]

const AUDIO_FORMATS = [
  { value: 'auto', label: 'Auto - Best Available' },
  { value: 'mp3', label: 'MP3' },
  { value: 'aac', label: 'AAC' },
  { value: 'opus', label: 'Opus' },
  { value: 'm4a', label: 'M4A' },
  { value: 'flac', label: 'FLAC (Lossless)' },
]

const AUDIO_BITRATES = [
  { value: 'auto', label: 'Auto - Source Quality' },
  { value: '320', label: '320 kbps (High)' },
  { value: '256', label: '256 kbps' },
  { value: '192', label: '192 kbps (Medium)' },
  { value: '128', label: '128 kbps' },
  { value: '96', label: '96 kbps (Low)' },
]

const FILENAME_STYLES = [
  { value: 'original', label: 'Original - Keep Source Name' },
  { value: 'clean', label: 'Clean - Remove Special Chars' },
  { value: 'timestamp', label: 'Timestamp - Add Date/Time' },
  { value: 'custom', label: 'Custom - Coming Soon' },
]

export function DownloadSettings({ isLoaded }: DownloadSettingsProps) {
  const { settings: appearanceSettings } = useAppearanceContext()
  const { settings, updateSettings, resetSettings } = useDownloadSettingsContext()

  const toggleSetting = (key: 'embedThumbnail' | 'embedMetadata' | 'downloadSubtitles') => {
    updateSettings({ [key]: !settings[key] })
  }

  // Check for potential issues
  const getCodecContainerWarning = () => {
    if (settings.videoCodec === 'vp9' && settings.fileContainer === 'mp4') {
      return 'VP9 codec may not be compatible with MP4 container'
    }
    if (settings.videoCodec === 'av1' && settings.fileContainer === 'mp4') {
      return 'AV1 codec may not be compatible with MP4 container'
    }
    return null
  }

  const getAudioWarning = () => {
    if (settings.audioFormat === 'flac' && settings.audioBitrate !== 'auto') {
      return 'Bitrate setting will be ignored for FLAC (lossless format)'
    }
    if (settings.audioFormat === 'mp3' && (settings.embedThumbnail || settings.embedMetadata)) {
      return 'MP3 has limited metadata support compared to other formats'
    }
    return null
  }

  const getSubtitleWarning = () => {
    if (settings.downloadSubtitles && settings.audioFormat !== 'auto') {
      return 'Subtitles cannot be downloaded with audio-only formats'
    }
    return null
  }

  return (
    <MotionConfig reducedMotion={appearanceSettings.reducedMotion ? "always" : "never"}>
      <div className="space-y-8">
        {/* Video Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                <Video className="h-5 w-5" />
                {!isLoaded ? (
                  <ScrambleText text="VIDEO SETTINGS" delay={1700} scrambleSpeed={12} revealSpeed={20} />
                ) : (
                  'VIDEO SETTINGS'
                )}
              </h3>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">
                {!isLoaded ? (
                  <ScrambleText text="CONFIGURE VIDEO QUALITY AND FORMAT" delay={1800} scrambleSpeed={12} revealSpeed={18} />
                ) : (
                  'CONFIGURE VIDEO QUALITY AND FORMAT'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                Video Quality
                {settings.audioFormat !== 'auto' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Disabled - Audio format selected)</span>
                )}
              </label>
              <Select
                value={settings.videoQuality}
                onValueChange={(value) => updateSettings({ videoQuality: value as any })}
                disabled={settings.audioFormat !== 'auto'}
              >
                <SelectTrigger className={settings.audioFormat !== 'auto' ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_QUALITIES.map((quality) => (
                    <SelectItem key={quality.value} value={quality.value}>
                      {quality.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                Video Codec
                {settings.audioFormat !== 'auto' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Disabled - Audio format selected)</span>
                )}
              </label>
              <Select
                value={settings.videoCodec}
                onValueChange={(value) => updateSettings({ videoCodec: value as any })}
                disabled={settings.audioFormat !== 'auto'}
              >
                <SelectTrigger className={settings.audioFormat !== 'auto' ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_CODECS.map((codec) => (
                    <SelectItem key={codec.value} value={codec.value}>
                      {codec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getCodecContainerWarning() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs uppercase tracking-wide"
                >
                  ⚠ {getCodecContainerWarning()}
                </motion.div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                File Container
                {settings.audioFormat !== 'auto' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Disabled - Audio format selected)</span>
                )}
              </label>
              <Select
                value={settings.fileContainer}
                onValueChange={(value) => updateSettings({ fileContainer: value as any })}
                disabled={settings.audioFormat !== 'auto'}
              >
                <SelectTrigger className={settings.audioFormat !== 'auto' ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_CONTAINERS.map((container) => (
                    <SelectItem key={container.value} value={container.value}>
                      {container.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Audio Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.1 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
            <Music className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="AUDIO SETTINGS" delay={1900} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'AUDIO SETTINGS'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="CONFIGURE AUDIO QUALITY AND FORMAT" delay={2000} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'CONFIGURE AUDIO QUALITY AND FORMAT'
            )}
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                Audio Format
                {settings.videoQuality !== 'auto' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Disabled - Video quality selected)</span>
                )}
              </label>
              <Select
                value={settings.audioFormat}
                onValueChange={(value) => updateSettings({ audioFormat: value as any })}
                disabled={settings.videoQuality !== 'auto'}
              >
                <SelectTrigger className={settings.videoQuality !== 'auto' ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIO_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAudioWarning() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs uppercase tracking-wide"
                >
                  ℹ {getAudioWarning()}
                </motion.div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                Audio Bitrate
                {settings.videoQuality !== 'auto' && (
                  <span className="ml-2 text-xs text-muted-foreground">(Disabled - Video quality selected)</span>
                )}
                {settings.audioFormat === 'flac' && settings.audioBitrate !== 'auto' && (
                  <span className="ml-2 text-xs text-blue-400">(Always lossless for FLAC)</span>
                )}
              </label>
              <Select
                value={settings.audioBitrate}
                onValueChange={(value) => updateSettings({ audioBitrate: value as any })}
                disabled={settings.videoQuality !== 'auto' || settings.audioFormat === 'flac'}
              >
                <SelectTrigger className={(settings.videoQuality !== 'auto' || settings.audioFormat === 'flac') ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIO_BITRATES.map((bitrate) => (
                    <SelectItem key={bitrate.value} value={bitrate.value}>
                      {bitrate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* File Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.2 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="FILE SETTINGS" delay={2100} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'FILE SETTINGS'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="CONFIGURE FILENAME AND METADATA" delay={2200} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'CONFIGURE FILENAME AND METADATA'
            )}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                Filename Style
              </label>
              <Select 
                value={settings.filenameStyle} 
                onValueChange={(value) => updateSettings({ filenameStyle: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILENAME_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <motion.button
                onClick={() => toggleSetting('embedThumbnail')}
                className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                  settings.embedThumbnail
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-border/80'
                }`}
                whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-accent opacity-0"
                  animate={{ opacity: settings.embedThumbnail ? [0, 0.1, 0] : 0 }}
                  transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
                />
                <div className="flex items-start gap-4 relative z-10">
                  <motion.div
                    animate={{
                      scale: settings.embedThumbnail ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: ANIMATION_DURATIONS.fast }}
                    className={`w-6 h-6 border-2 flex items-center justify-center ${
                      settings.embedThumbnail ? 'border-accent bg-accent' : 'border-border'
                    }`}
                  >
                    {settings.embedThumbnail && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-background"
                      />
                    )}
                  </motion.div>
                  <div>
                    <p className="font-bold uppercase tracking-wider mb-1">EMBED THUMBNAIL</p>
                    <p className="text-sm text-muted-foreground">
                      Include video thumbnail in file metadata
                    </p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                onClick={() => toggleSetting('embedMetadata')}
                className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                  settings.embedMetadata
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-border/80'
                }`}
                whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  className="absolute inset-0 bg-accent opacity-0"
                  animate={{ opacity: settings.embedMetadata ? [0, 0.1, 0] : 0 }}
                  transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
                />
                <div className="flex items-start gap-4 relative z-10">
                  <motion.div
                    animate={{
                      scale: settings.embedMetadata ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: ANIMATION_DURATIONS.fast }}
                    className={`w-6 h-6 border-2 flex items-center justify-center ${
                      settings.embedMetadata ? 'border-accent bg-accent' : 'border-border'
                    }`}
                  >
                    {settings.embedMetadata && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-background"
                      />
                    )}
                  </motion.div>
                  <div>
                    <p className="font-bold uppercase tracking-wider mb-1">EMBED METADATA</p>
                    <p className="text-sm text-muted-foreground">
                      Include title, description, and uploader info
                    </p>
                  </div>
                </div>
              </motion.button>

              <div>
                <motion.button
                  onClick={() => toggleSetting('downloadSubtitles')}
                  className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                    settings.audioFormat !== 'auto'
                      ? 'border-border/50 bg-secondary/20 cursor-not-allowed opacity-50'
                      : settings.downloadSubtitles
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border/80'
                  }`}
                  whileHover={settings.audioFormat === 'auto' ? { x: 6, transition: { duration: ANIMATION_DURATIONS.fast } } : {}}
                  whileTap={settings.audioFormat === 'auto' ? { scale: 0.98 } : {}}
                  disabled={settings.audioFormat !== 'auto'}
                >
                  <motion.div
                    className="absolute inset-0 bg-accent opacity-0"
                    animate={{ opacity: settings.downloadSubtitles && settings.audioFormat === 'auto' ? [0, 0.1, 0] : 0 }}
                    transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
                  />
                  <div className="flex items-start gap-4 relative z-10">
                    <motion.div
                      animate={{
                        scale: settings.downloadSubtitles && settings.audioFormat === 'auto' ? [1, 1.2, 1] : 1,
                      }}
                      transition={{ duration: ANIMATION_DURATIONS.fast }}
                      className={`w-6 h-6 border-2 flex items-center justify-center ${
                        settings.downloadSubtitles && settings.audioFormat === 'auto' ? 'border-accent bg-accent' : 'border-border'
                      }`}
                    >
                      {settings.downloadSubtitles && settings.audioFormat === 'auto' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 bg-background"
                        />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-bold uppercase tracking-wider mb-1">DOWNLOAD SUBTITLES</p>
                      <p className="text-sm text-muted-foreground">
                        Download available subtitles as separate files
                        {settings.audioFormat !== 'auto' && (
                          <span className="block text-red-400 text-xs mt-1">(Not available for audio-only downloads)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </motion.button>
                {getSubtitleWarning() && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs uppercase tracking-wide"
                  >
                    ⚠ {getSubtitleWarning()}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reset Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.3 }}
          className="border-t-2 border-border pt-8"
        >
          <Button
            onClick={resetSettings}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default Settings
          </Button>
        </motion.div>
      </div>
    </MotionConfig>
  )
}

