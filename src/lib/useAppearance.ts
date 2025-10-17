import { useEffect, useState } from 'react'

export interface AppearanceSettings {
  reducedMotion: boolean
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  reducedMotion: false,
}

function getStoredAppearanceSettings(): AppearanceSettings {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('appearance-settings')
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

export function useAppearance() {
  const [settings, setSettingsState] = useState<AppearanceSettings>(getStoredAppearanceSettings)

  useEffect(() => {
    const root = document.documentElement
    
    if (settings.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true')
    } else {
      root.removeAttribute('data-reduced-motion')
    }
  }, [settings])

  const updateSettings = (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettingsState(newSettings)
    localStorage.setItem('appearance-settings', JSON.stringify(newSettings))
  }

  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !settings.reducedMotion })
  }

  return {
    settings,
    updateSettings,
    toggleReducedMotion,
  }
}

