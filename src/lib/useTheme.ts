import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored
    }
  }
  return 'system'
}

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => 
    getEffectiveTheme(getStoredTheme())
  )

  useEffect(() => {
    const updateEffectiveTheme = () => {
      const newEffectiveTheme = getEffectiveTheme(theme)
      setEffectiveTheme(newEffectiveTheme)

      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newEffectiveTheme)
    }

    updateEffectiveTheme()
  }, [theme])

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = () => {
        const newEffectiveTheme = getSystemTheme()
        setEffectiveTheme(newEffectiveTheme)
        
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(newEffectiveTheme)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return {
    theme,
    effectiveTheme,
    setTheme,
  }
}

