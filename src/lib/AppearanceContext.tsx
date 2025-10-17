import { createContext, useContext, ReactNode } from 'react'
import { useAppearance, AppearanceSettings } from './useAppearance'

interface AppearanceContextType {
  settings: AppearanceSettings
  updateSettings: (updates: Partial<AppearanceSettings>) => void
  toggleReducedMotion: () => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance()

  return (
    <AppearanceContext.Provider value={appearance}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearanceContext() {
  const context = useContext(AppearanceContext)
  if (context === undefined) {
    return {
      settings: { reducedMotion: false },
      updateSettings: () => {},
      toggleReducedMotion: () => {},
    }
  }
  return context
}

