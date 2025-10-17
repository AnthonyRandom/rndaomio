import { useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { Download, Upload, Trash2, Database, HardDrive, Settings as SettingsIcon, AlertTriangle, CheckCircle2, Copy } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { Button } from './ui/button'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { useDownloadSettingsContext } from '@/lib/DownloadSettingsContext'
import { useCompressionSettingsContext } from '@/lib/CompressionSettingsContext'
import { useTheme } from '@/lib/useTheme'
import { ANIMATION_DURATIONS } from '@/lib/animationConstants'

interface AdvancedSettingsProps {
  isLoaded: boolean
}

interface ExportData {
  version: string
  exportDate: string
  theme: string
  appearance: any
  downloads: any
  compression: any
}

export function AdvancedSettings({ isLoaded }: AdvancedSettingsProps) {
  const { settings: appearanceSettings } = useAppearanceContext()
  const { theme } = useTheme()
  const { resetSettings: resetDownloadSettings } = useDownloadSettingsContext()
  const { resetSettings: resetCompressionSettings } = useCompressionSettingsContext()
  
  const [exportSuccess, setExportSuccess] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [copiedDebug, setCopiedDebug] = useState(false)

  const exportSettings = () => {
    const exportData: ExportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      theme: theme,
      appearance: JSON.parse(localStorage.getItem('appearance-settings') || '{}'),
      downloads: JSON.parse(localStorage.getItem('download-settings') || '{}'),
      compression: JSON.parse(localStorage.getItem('compression-settings') || '{}'),
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `rndaomio-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 3000)
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string) as ExportData

        // Validate import data
        if (!importData.version || !importData.theme) {
          throw new Error('Invalid settings file format')
        }

        // Apply imported settings
        localStorage.setItem('theme', importData.theme)
        if (importData.appearance) {
          localStorage.setItem('appearance-settings', JSON.stringify(importData.appearance))
        }
        if (importData.downloads) {
          localStorage.setItem('download-settings', JSON.stringify(importData.downloads))
        }
        if (importData.compression) {
          localStorage.setItem('compression-settings', JSON.stringify(importData.compression))
        }

        setImportSuccess(true)
        setImportError(null)
        setTimeout(() => {
          setImportSuccess(false)
          // Reload to apply settings
          window.location.reload()
        }, 2000)
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import settings')
        setTimeout(() => setImportError(null), 5000)
      }
    }
    reader.readAsText(file)
    
    // Reset input
    event.target.value = ''
  }

  const clearAllData = () => {
    const keys = ['theme', 'appearance-settings', 'download-settings', 'compression-settings']
    keys.forEach(key => localStorage.removeItem(key))
    
    setShowClearConfirm(false)
    setTimeout(() => window.location.reload(), 500)
  }

  const resetAppearanceSettings = () => {
    localStorage.removeItem('appearance-settings')
    window.location.reload()
  }

  const resetDownloadSettingsHandler = () => {
    resetDownloadSettings()
  }

  const resetTheme = () => {
    localStorage.removeItem('theme')
    window.location.reload()
  }

  const getDebugInfo = () => {
    const info = {
      version: '1.0.0',
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: {
        theme: localStorage.getItem('theme'),
        appearance: localStorage.getItem('appearance-settings'),
        downloads: localStorage.getItem('download-settings'),
        compression: localStorage.getItem('compression-settings'),
      },
      timestamp: new Date().toISOString(),
    }
    return JSON.stringify(info, null, 2)
  }

  const copyDebugInfo = () => {
    navigator.clipboard.writeText(getDebugInfo())
    setCopiedDebug(true)
    setTimeout(() => setCopiedDebug(false), 2000)
  }

  return (
    <MotionConfig reducedMotion={appearanceSettings.reducedMotion ? "always" : "never"}>
      <div className="space-y-8">
        {/* Import/Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal }}
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
            <Database className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="DATA MANAGEMENT" delay={1700} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'DATA MANAGEMENT'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            {!isLoaded ? (
              <ScrambleText text="EXPORT, IMPORT, AND BACKUP YOUR SETTINGS" delay={1800} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'EXPORT, IMPORT, AND BACKUP YOUR SETTINGS'
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={exportSettings}
                className="w-full relative overflow-hidden"
                variant="outline"
                size="lg"
              >
                {exportSuccess ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Exported Successfully
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export Settings
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => document.getElementById('import-input')?.click()}
                className="w-full relative overflow-hidden"
                variant="outline"
                size="lg"
              >
                {importSuccess ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Imported Successfully
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Import Settings
                  </>
                )}
              </Button>
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </motion.div>
          </div>

          {importError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-500/10 border-2 border-red-500 text-red-400"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm uppercase tracking-wide font-bold">Import Failed</p>
              </div>
              <p className="text-xs mt-1">{importError}</p>
            </motion.div>
          )}

          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-4">
            Export creates a JSON file with all your settings. Import to restore them on another device or after clearing data.
          </p>
        </motion.div>

        {/* Storage Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.1 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
            <HardDrive className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="STORAGE INFO" delay={1900} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'STORAGE INFO'
            )}
          </h3>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="border-4 border-border p-6 bg-secondary/20"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wider font-bold">Theme Settings</span>
                <span className="text-sm text-accent">
                  {new Blob([localStorage.getItem('theme') || '']).size} bytes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wider font-bold">Appearance Settings</span>
                <span className="text-sm text-accent">
                  {new Blob([localStorage.getItem('appearance-settings') || '']).size} bytes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wider font-bold">Download Settings</span>
                <span className="text-sm text-accent">
                  {new Blob([localStorage.getItem('download-settings') || '']).size} bytes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wider font-bold">Compression Settings</span>
                <span className="text-sm text-accent">
                  {new Blob([localStorage.getItem('compression-settings') || '']).size} bytes
                </span>
              </div>
              <div className="border-t-2 border-border pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wider font-bold">Total Used</span>
                  <span className="text-sm text-accent font-bold">
                    {(
                      new Blob([localStorage.getItem('theme') || '']).size +
                      new Blob([localStorage.getItem('appearance-settings') || '']).size +
                      new Blob([localStorage.getItem('download-settings') || '']).size +
                      new Blob([localStorage.getItem('compression-settings') || '']).size
                    )} bytes
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Reset Individual Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.2 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
            <SettingsIcon className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="RESET SETTINGS" delay={2100} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'RESET SETTINGS'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            Reset individual setting categories to defaults
          </p>

          <div className="space-y-3">
            <motion.div
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Theme Settings</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Reset to system default theme
                  </p>
                </div>
                <Button onClick={resetTheme} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Appearance Settings</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Reset animations and visual preferences
                  </p>
                </div>
                <Button onClick={resetAppearanceSettings} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Download Settings</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Reset video, audio, and file preferences
                  </p>
                </div>
                <Button onClick={resetDownloadSettingsHandler} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
              className="border-2 border-border p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Compression Settings</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    Reset image, video, audio, and GIF compression preferences
                  </p>
                </div>
                <Button onClick={resetCompressionSettings} variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Debug Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.3 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-4">
            <Copy className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="DEBUG INFO" delay={2300} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'DEBUG INFO'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            Copy system information for troubleshooting
          </p>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={copyDebugInfo}
              className="w-full"
              variant="outline"
              size="lg"
            >
              {copiedDebug ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Debug Information
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.4 }}
          className="border-t-2 border-border pt-8"
        >
          <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 mb-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            {!isLoaded ? (
              <ScrambleText text="DANGER ZONE" delay={2500} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'DANGER ZONE'
            )}
          </h3>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
            Irreversible actions - proceed with caution
          </p>

          {!showClearConfirm ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => setShowClearConfirm(true)}
                className="w-full"
                variant="destructive"
                size="lg"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Clear All Local Data
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-4 border-red-500 bg-red-500/10 p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold uppercase text-red-500 mb-2">
                    Are you absolutely sure?
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    This will permanently delete all settings, preferences, and cached data. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={clearAllData}
                  variant="destructive"
                  size="sm"
                >
                  Yes, Delete Everything
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </MotionConfig>
  )
}

