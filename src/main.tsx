import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppearanceProvider } from './lib/AppearanceContext.tsx'
import { DownloadSettingsProvider } from './lib/DownloadSettingsContext.tsx'
import { CompressionSettingsProvider } from './lib/CompressionSettingsContext.tsx'

function initializeTheme() {
  const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
  const theme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system'
  
  let effectiveTheme: 'light' | 'dark'
  if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    effectiveTheme = theme
  }
  
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(effectiveTheme)
}

function initializeAppearance() {
  const stored = localStorage.getItem('appearance-settings')
  const defaultSettings = {
    reducedMotion: false,
  }
  
  let settings = defaultSettings
  if (stored) {
    try {
      settings = { ...defaultSettings, ...JSON.parse(stored) }
    } catch {
      settings = defaultSettings
    }
  }
  
  const root = document.documentElement
  if (settings.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true')
  }
}

initializeTheme()
initializeAppearance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <DownloadSettingsProvider>
        <CompressionSettingsProvider>
          <App />
        </CompressionSettingsProvider>
      </DownloadSettingsProvider>
    </AppearanceProvider>
  </StrictMode>,
)

