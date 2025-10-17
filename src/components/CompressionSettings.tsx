import { motion, MotionConfig } from 'framer-motion'
import { Zap, Image, Video, Music, FileImage, Info } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { useCompressionSettingsContext } from '@/lib/CompressionSettingsContext'
import { ANIMATION_DURATIONS } from '@/lib/animationConstants'

interface CompressionSettingsProps {
  isLoaded: boolean
}

export function CompressionSettings({ isLoaded }: CompressionSettingsProps) {
  const { settings: appearanceSettings } = useAppearanceContext()
  const { settings, updateSettings } = useCompressionSettingsContext()

  return (
    <MotionConfig reducedMotion={appearanceSettings.reducedMotion ? "always" : "never"}>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          className="border-b-2 border-border pb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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
              <ScrambleText text="COMPRESSION SETTINGS" delay={1500} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'COMPRESSION SETTINGS'
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
            {!isLoaded ? (
              <ScrambleText text="CUSTOMIZE COMPRESSION BEHAVIOR" delay={1600} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'CUSTOMIZE COMPRESSION BEHAVIOR'
            )}
          </p>
        </motion.div>

        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.1 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="GENERAL" delay={1700} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'GENERAL'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="DEFAULT COMPRESSION PREFERENCES" delay={1800} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'DEFAULT COMPRESSION PREFERENCES'
            )}
          </p>

          <div className="space-y-6">
            {/* Default Target Size */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                DEFAULT TARGET SIZE
              </label>
              <Select 
                value={settings.defaultTargetSize} 
                onValueChange={(value) => updateSettings({ defaultTargetSize: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10MB">10 MB - FREE TIER</SelectItem>
                  <SelectItem value="50MB">50 MB - NITRO CLASSIC</SelectItem>
                  <SelectItem value="500MB">500 MB - NITRO BOOST</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">The compressor will remember your last selected target size</p>
            </div>

            {/* Preserve Original Filenames */}
            <motion.button
              onClick={() => updateSettings({ preserveOriginalFilenames: !settings.preserveOriginalFilenames })}
              className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                settings.preserveOriginalFilenames
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-border/80'
              }`}
              whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-accent opacity-0"
                animate={{ opacity: settings.preserveOriginalFilenames ? [0, 0.1, 0] : 0 }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
              />
              <div className="flex items-start gap-4 relative z-10">
                <motion.div
                  animate={{
                    scale: settings.preserveOriginalFilenames ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: ANIMATION_DURATIONS.fast }}
                  className={`w-6 h-6 border-2 flex items-center justify-center ${
                    settings.preserveOriginalFilenames ? 'border-accent bg-accent' : 'border-border'
                  }`}
                >
                  {settings.preserveOriginalFilenames && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-background"
                    />
                  )}
                </motion.div>
                <div>
                  <p className="font-bold uppercase tracking-wider mb-1">PRESERVE ORIGINAL FILENAMES</p>
                  <p className="text-sm text-muted-foreground">
                    Use original filename instead of adding "compressed_" prefix
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Image Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.2 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Image className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="IMAGE COMPRESSION" delay={1900} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'IMAGE COMPRESSION'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="JPEG, PNG, WEBP, AVIF, TIFF" delay={2000} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'JPEG, PNG, WEBP, AVIF, TIFF'
            )}
          </p>

          <div className="space-y-6">
            {/* Output Format */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                OUTPUT FORMAT
              </label>
              <Select 
                value={settings.imageOutputFormat} 
                onValueChange={(value) => updateSettings({ imageOutputFormat: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">KEEP ORIGINAL FORMAT</SelectItem>
                  <SelectItem value="webp">CONVERT TO WEBP (SMALLER SIZE)</SelectItem>
                  <SelectItem value="jpeg">CONVERT TO JPEG (COMPATIBILITY)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.imageOutputFormat === 'webp' && 'WebP provides better compression than JPEG/PNG'}
                {settings.imageOutputFormat === 'jpeg' && 'JPEG is universally supported but lossy'}
                {settings.imageOutputFormat === 'original' && 'Maintains the original image format'}
              </p>
            </div>

            {/* Quality Preference */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                QUALITY PREFERENCE
              </label>
              <Select 
                value={settings.imageQualityPreference} 
                onValueChange={(value) => updateSettings({ imageQualityPreference: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maximum">MAXIMUM QUALITY (SLOWER)</SelectItem>
                  <SelectItem value="balanced">BALANCED (RECOMMENDED)</SelectItem>
                  <SelectItem value="aggressive">AGGRESSIVE COMPRESSION</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.imageQualityPreference === 'maximum' && 'Prioritizes quality over file size and speed'}
                {settings.imageQualityPreference === 'balanced' && 'Good balance between quality, size, and speed'}
                {settings.imageQualityPreference === 'aggressive' && 'Prioritizes smallest file size'}
              </p>
            </div>

            {/* Strip Metadata */}
            <motion.button
              onClick={() => updateSettings({ stripImageMetadata: !settings.stripImageMetadata })}
              className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                settings.stripImageMetadata
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-border/80'
              }`}
              whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-accent opacity-0"
                animate={{ opacity: settings.stripImageMetadata ? [0, 0.1, 0] : 0 }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
              />
              <div className="flex items-start gap-4 relative z-10">
                <motion.div
                  animate={{
                    scale: settings.stripImageMetadata ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: ANIMATION_DURATIONS.fast }}
                  className={`w-6 h-6 border-2 flex items-center justify-center ${
                    settings.stripImageMetadata ? 'border-accent bg-accent' : 'border-border'
                  }`}
                >
                  {settings.stripImageMetadata && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-background"
                    />
                  )}
                </motion.div>
                <div>
                  <p className="font-bold uppercase tracking-wider mb-1">STRIP EXIF METADATA</p>
                  <p className="text-sm text-muted-foreground">
                    Remove camera info, location, and other metadata (reduces size and protects privacy)
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Video Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.3 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Video className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="VIDEO COMPRESSION" delay={2100} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'VIDEO COMPRESSION'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="MP4, MOV, AVI, WEBM, MKV" delay={2200} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'MP4, MOV, AVI, WEBM, MKV'
            )}
          </p>

          <div className="space-y-6">
            {/* Encoder Preset */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                ENCODER PRESET
              </label>
              <Select 
                value={settings.videoEncoderPreset} 
                onValueChange={(value) => updateSettings({ videoEncoderPreset: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultrafast">ULTRAFAST (LOWEST QUALITY)</SelectItem>
                  <SelectItem value="fast">FAST (BALANCED)</SelectItem>
                  <SelectItem value="medium">MEDIUM (BETTER QUALITY)</SelectItem>
                  <SelectItem value="slow">SLOW (BEST QUALITY)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.videoEncoderPreset === 'ultrafast' && 'Fastest compression but larger file size'}
                {settings.videoEncoderPreset === 'fast' && 'Good balance between speed and quality'}
                {settings.videoEncoderPreset === 'medium' && 'Better quality at the cost of speed'}
                {settings.videoEncoderPreset === 'slow' && 'Best quality but slowest encoding'}
              </p>
            </div>

            {/* Audio Handling */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                AUDIO HANDLING
              </label>
              <Select 
                value={settings.videoAudioHandling} 
                onValueChange={(value) => updateSettings({ videoAudioHandling: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preserve">ALWAYS PRESERVE AUDIO</SelectItem>
                  <SelectItem value="reduce_if_needed">REDUCE QUALITY IF NEEDED</SelectItem>
                  <SelectItem value="remove_if_needed">REMOVE IF NEEDED</SelectItem>
                  <SelectItem value="always_remove">ALWAYS REMOVE AUDIO</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.videoAudioHandling === 'preserve' && 'Audio will never be modified or removed'}
                {settings.videoAudioHandling === 'reduce_if_needed' && 'Audio quality may be reduced to meet target size'}
                {settings.videoAudioHandling === 'remove_if_needed' && 'Audio may be removed if necessary to meet target size'}
                {settings.videoAudioHandling === 'always_remove' && 'All audio tracks will be removed'}
              </p>
            </div>

            {/* Minimum Audio Bitrate */}
            {settings.videoAudioHandling !== 'always_remove' && (
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                  MINIMUM AUDIO BITRATE
                </label>
                <Select 
                  value={settings.videoMinAudioBitrate.toString()} 
                  onValueChange={(value) => updateSettings({ videoMinAudioBitrate: parseInt(value) as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 KBPS (MINIMUM)</SelectItem>
                    <SelectItem value="32">32 KBPS (LOW)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Lower bitrates save space but reduce audio quality. Mono channel used for minimum bitrate.
                </p>
              </div>
            )}

            {/* Maximum Resolution */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                MAXIMUM RESOLUTION DOWNSCALE
              </label>
              <Select 
                value={settings.videoMaxResolution} 
                onValueChange={(value) => updateSettings({ videoMaxResolution: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">NO LIMIT</SelectItem>
                  <SelectItem value="1080p">1080P (FULL HD)</SelectItem>
                  <SelectItem value="720p">720P (HD)</SelectItem>
                  <SelectItem value="480p">480P (SD)</SelectItem>
                  <SelectItem value="360p">360P (MOBILE)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.videoMaxResolution === 'original' && 'Resolution can be reduced as needed to meet target size'}
                {settings.videoMaxResolution !== 'original' && `Video will not be downscaled below ${settings.videoMaxResolution}`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Audio Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.4 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <Music className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="AUDIO COMPRESSION" delay={2300} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'AUDIO COMPRESSION'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="MP3, AAC, OGG, OPUS, FLAC, WAV" delay={2400} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'MP3, AAC, OGG, OPUS, FLAC, WAV'
            )}
          </p>

          <div className="space-y-6">
            {/* Output Format */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                OUTPUT FORMAT
              </label>
              <Select 
                value={settings.audioOutputFormat} 
                onValueChange={(value) => updateSettings({ audioOutputFormat: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">KEEP ORIGINAL FORMAT</SelectItem>
                  <SelectItem value="optimize">OPTIMIZE FOR SIZE (AAC/OPUS)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.audioOutputFormat === 'original' && 'Maintains the original audio codec'}
                {settings.audioOutputFormat === 'optimize' && 'Converts to modern codecs for better compression'}
              </p>
            </div>

            {/* Minimum Bitrate */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                MINIMUM BITRATE
              </label>
              <Select 
                value={settings.audioMinBitrate.toString()} 
                onValueChange={(value) => updateSettings({ audioMinBitrate: parseInt(value) as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="32">32 KBPS (MINIMUM)</SelectItem>
                  <SelectItem value="48">48 KBPS (LOW)</SelectItem>
                  <SelectItem value="64">64 KBPS (ACCEPTABLE)</SelectItem>
                  <SelectItem value="96">96 KBPS (GOOD)</SelectItem>
                  <SelectItem value="128">128 KBPS (HIGH)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                The compressor will not reduce bitrate below this threshold
              </p>
            </div>

            {/* Trim Silence */}
            <motion.button
              onClick={() => updateSettings({ audioTrimSilence: !settings.audioTrimSilence })}
              className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                settings.audioTrimSilence
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-border/80'
              }`}
              whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-accent opacity-0"
                animate={{ opacity: settings.audioTrimSilence ? [0, 0.1, 0] : 0 }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
              />
              <div className="flex items-start gap-4 relative z-10">
                <motion.div
                  animate={{
                    scale: settings.audioTrimSilence ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: ANIMATION_DURATIONS.fast }}
                  className={`w-6 h-6 border-2 flex items-center justify-center ${
                    settings.audioTrimSilence ? 'border-accent bg-accent' : 'border-border'
                  }`}
                >
                  {settings.audioTrimSilence && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-background"
                    />
                  )}
                </motion.div>
                <div>
                  <p className="font-bold uppercase tracking-wider mb-1">TRIM SILENCE</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically remove silent parts at the beginning and end of audio files
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Allow Mono */}
            <motion.button
              onClick={() => updateSettings({ audioAllowMono: !settings.audioAllowMono })}
              className={`relative w-full overflow-hidden border-4 p-6 text-left transition-all ${
                settings.audioAllowMono
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-border/80'
              }`}
              whileHover={{ x: 6, transition: { duration: ANIMATION_DURATIONS.fast } }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-accent opacity-0"
                animate={{ opacity: settings.audioAllowMono ? [0, 0.1, 0] : 0 }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
              />
              <div className="flex items-start gap-4 relative z-10">
                <motion.div
                  animate={{
                    scale: settings.audioAllowMono ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: ANIMATION_DURATIONS.fast }}
                  className={`w-6 h-6 border-2 flex items-center justify-center ${
                    settings.audioAllowMono ? 'border-accent bg-accent' : 'border-border'
                  }`}
                >
                  {settings.audioAllowMono && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-background"
                    />
                  )}
                </motion.div>
                <div>
                  <p className="font-bold uppercase tracking-wider mb-1">ALLOW MONO CONVERSION</p>
                  <p className="text-sm text-muted-foreground">
                    Convert stereo to mono for lower bitrates (saves ~50% file size)
                  </p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* GIF Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.5 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="GIF COMPRESSION" delay={2500} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'GIF COMPRESSION'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="ANIMATED GIF OPTIMIZATION" delay={2600} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'ANIMATED GIF OPTIMIZATION'
            )}
          </p>

          <div className="space-y-6">
            {/* Quality Preference */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                QUALITY PREFERENCE
              </label>
              <Select 
                value={settings.gifQualityPreference} 
                onValueChange={(value) => updateSettings({ gifQualityPreference: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maximum">MAXIMUM QUALITY</SelectItem>
                  <SelectItem value="balanced">BALANCED (RECOMMENDED)</SelectItem>
                  <SelectItem value="aggressive">AGGRESSIVE COMPRESSION</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.gifQualityPreference === 'maximum' && 'Preserves maximum visual quality (slower, larger files)'}
                {settings.gifQualityPreference === 'balanced' && 'Good balance between quality and file size'}
                {settings.gifQualityPreference === 'aggressive' && 'Prioritizes smallest file size'}
              </p>
            </div>

            {/* Minimum Color Count */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3">
                MINIMUM COLOR COUNT
              </label>
              <Select 
                value={settings.gifMinColors.toString()} 
                onValueChange={(value) => updateSettings({ gifMinColors: parseInt(value) as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="256">256 COLORS (MAXIMUM QUALITY)</SelectItem>
                  <SelectItem value="128">128 COLORS (HIGH QUALITY)</SelectItem>
                  <SelectItem value="64">64 COLORS (MODERATE)</SelectItem>
                  <SelectItem value="32">32 COLORS (AGGRESSIVE)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                The compressor will not reduce colors below this threshold
              </p>
            </div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-4 border-cyan-500/50 bg-cyan-500/5 p-4 flex items-start gap-3"
            >
              <Info className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold uppercase text-cyan-500 mb-1">
                  COMPRESSION NOTE
                </p>
                <p className="text-sm text-muted-foreground">
                  GIF compression uses lossy optimization and color reduction. Very large GIFs may take several minutes to process.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  )
}

