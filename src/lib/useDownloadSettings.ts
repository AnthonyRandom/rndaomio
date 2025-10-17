import { useState } from 'react'

export type VideoQuality = 'auto' | '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p'
export type VideoCodec = 'auto' | 'h264' | 'h265' | 'vp9' | 'av1'
export type FileContainer = 'auto' | 'mp4' | 'mkv' | 'webm'
export type AudioFormat = 'auto' | 'mp3' | 'aac' | 'opus' | 'm4a' | 'flac'
export type AudioBitrate = 'auto' | '320' | '256' | '192' | '128' | '96'
export type FilenameStyle = 'original' | 'clean' | 'timestamp' | 'custom'

export interface DownloadSettings {
  videoQuality: VideoQuality
  videoCodec: VideoCodec
  fileContainer: FileContainer
  audioFormat: AudioFormat
  audioBitrate: AudioBitrate
  filenameStyle: FilenameStyle
  embedThumbnail: boolean
  embedMetadata: boolean
  downloadSubtitles: boolean
}

const DEFAULT_SETTINGS: DownloadSettings = {
  videoQuality: 'auto',
  videoCodec: 'auto',
  fileContainer: 'auto',
  audioFormat: 'auto',
  audioBitrate: 'auto',
  filenameStyle: 'clean',
  embedThumbnail: true,
  embedMetadata: true,
  downloadSubtitles: false,
}

function getStoredDownloadSettings(): DownloadSettings {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('download-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
  }
  return DEFAULT_SETTINGS
}

export function useDownloadSettings() {
  const [settings, setSettingsState] = useState<DownloadSettings>(getStoredDownloadSettings)

  const updateSettings = (updates: Partial<DownloadSettings>) => {
    let newSettings = { ...settings, ...updates }

    // Auto-correct conflicting settings
    if (updates.audioFormat && updates.audioFormat !== 'auto') {
      // If audio format is selected, reset video settings
      if (newSettings.videoQuality !== 'auto') {
        newSettings.videoQuality = 'auto'
      }
      if (newSettings.videoCodec !== 'auto') {
        newSettings.videoCodec = 'auto'
      }
      if (newSettings.fileContainer !== 'auto') {
        newSettings.fileContainer = 'auto'
      }
      // Disable subtitles for audio-only
      if (newSettings.downloadSubtitles) {
        newSettings.downloadSubtitles = false
      }
    }

    if (updates.videoQuality && updates.videoQuality !== 'auto') {
      // If video quality is selected, reset audio settings
      if (newSettings.audioFormat !== 'auto') {
        newSettings.audioFormat = 'auto'
        newSettings.audioBitrate = 'auto'
      }
    }

    // Auto-correct codec/container incompatibilities
    if (updates.videoCodec === 'vp9' && newSettings.fileContainer === 'mp4') {
      newSettings.fileContainer = 'webm'
    }
    if (updates.videoCodec === 'av1' && newSettings.fileContainer === 'mp4') {
      newSettings.fileContainer = 'mkv'
    }
    if (updates.fileContainer === 'mp4' && (newSettings.videoCodec === 'vp9' || newSettings.videoCodec === 'av1')) {
      newSettings.videoCodec = 'auto'
    }

    // Auto-correct FLAC bitrate (always lossless)
    if (updates.audioFormat === 'flac' && newSettings.audioBitrate !== 'auto') {
      newSettings.audioBitrate = 'auto'
    }

    setSettingsState(newSettings)
    localStorage.setItem('download-settings', JSON.stringify(newSettings))
  }

  const resetSettings = () => {
    setSettingsState(DEFAULT_SETTINGS)
    localStorage.setItem('download-settings', JSON.stringify(DEFAULT_SETTINGS))
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}

