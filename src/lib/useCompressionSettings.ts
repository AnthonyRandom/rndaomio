import { useState, useEffect } from 'react'

export interface CompressionSettings {
  // General Settings
  defaultTargetSize: '10MB' | '50MB' | '500MB'
  preserveOriginalFilenames: boolean
  
  // Image Settings
  imageOutputFormat: 'original' | 'webp' | 'jpeg'
  imageQualityPreference: 'maximum' | 'balanced' | 'aggressive'
  stripImageMetadata: boolean
  
  // Video Settings
  videoEncoderPreset: 'ultrafast' | 'fast' | 'medium' | 'slow'
  videoAudioHandling: 'preserve' | 'reduce_if_needed' | 'remove_if_needed' | 'always_remove'
  videoMinAudioBitrate: 24 | 32
  videoMaxResolution: 'original' | '1080p' | '720p' | '480p' | '360p'
  
  // Audio Settings
  audioOutputFormat: 'original' | 'optimize'
  audioMinBitrate: 32 | 48 | 64 | 96 | 128
  audioTrimSilence: boolean
  audioAllowMono: boolean
  
  // GIF Settings
  gifQualityPreference: 'maximum' | 'balanced' | 'aggressive'
  gifMinColors: 256 | 128 | 64 | 32
}

const DEFAULT_SETTINGS: CompressionSettings = {
  defaultTargetSize: '10MB',
  preserveOriginalFilenames: true,
  
  imageOutputFormat: 'original',
  imageQualityPreference: 'balanced',
  stripImageMetadata: true,
  
  videoEncoderPreset: 'fast',
  videoAudioHandling: 'reduce_if_needed',
  videoMinAudioBitrate: 24,
  videoMaxResolution: 'original',
  
  audioOutputFormat: 'original',
  audioMinBitrate: 32,
  audioTrimSilence: false,
  audioAllowMono: true,
  
  gifQualityPreference: 'balanced',
  gifMinColors: 32,
}

const STORAGE_KEY = 'compression-settings'

export function useCompressionSettings() {
  const [settings, setSettings] = useState<CompressionSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load compression settings:', error)
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save compression settings:', error)
    }
  }, [settings])

  const updateSettings = (updates: Partial<CompressionSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}

