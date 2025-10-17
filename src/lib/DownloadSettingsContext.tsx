import { createContext, useContext, ReactNode } from 'react'
import { useDownloadSettings, DownloadSettings } from './useDownloadSettings'

interface DownloadSettingsContextType {
  settings: DownloadSettings
  updateSettings: (updates: Partial<DownloadSettings>) => void
  resetSettings: () => void
}

const DownloadSettingsContext = createContext<DownloadSettingsContextType | undefined>(undefined)

export function DownloadSettingsProvider({ children }: { children: ReactNode }) {
  const downloadSettings = useDownloadSettings()

  return (
    <DownloadSettingsContext.Provider value={downloadSettings}>
      {children}
    </DownloadSettingsContext.Provider>
  )
}

export function useDownloadSettingsContext() {
  const context = useContext(DownloadSettingsContext)
  if (context === undefined) {
    return {
      settings: {
        videoQuality: 'auto' as const,
        videoCodec: 'auto' as const,
        fileContainer: 'auto' as const,
        audioFormat: 'auto' as const,
        audioBitrate: 'auto' as const,
        filenameStyle: 'clean' as const,
        embedThumbnail: true,
        embedMetadata: true,
        downloadSubtitles: false,
      },
      updateSettings: () => {},
      resetSettings: () => {},
    }
  }
  return context
}

