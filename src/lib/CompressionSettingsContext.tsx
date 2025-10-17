import React, { createContext, useContext } from 'react'
import { useCompressionSettings, CompressionSettings } from './useCompressionSettings'

interface CompressionSettingsContextType {
  settings: CompressionSettings
  updateSettings: (updates: Partial<CompressionSettings>) => void
  resetSettings: () => void
}

const CompressionSettingsContext = createContext<CompressionSettingsContextType | undefined>(undefined)

export function CompressionSettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings, resetSettings } = useCompressionSettings()

  return (
    <CompressionSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </CompressionSettingsContext.Provider>
  )
}

export function useCompressionSettingsContext() {
  const context = useContext(CompressionSettingsContext)
  if (context === undefined) {
    throw new Error('useCompressionSettingsContext must be used within a CompressionSettingsProvider')
  }
  return context
}

