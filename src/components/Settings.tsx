import { useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { Settings as SettingsIcon, Palette, Download, Wrench, Zap } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { ANIMATION_DURATIONS } from '@/lib/animationConstants'
import { AppearanceSettings } from './AppearanceSettings'
import { DownloadSettings } from './DownloadSettings'
import { CompressionSettings } from './CompressionSettings'
import { AdvancedSettings } from './AdvancedSettings'

interface SettingsProps {
  isLoaded: boolean
}

type SettingsSection = 'appearance' | 'downloads' | 'compression' | 'advanced'

export function Settings({ isLoaded }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')
  const { settings } = useAppearanceContext()

  const sections = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'downloads' as const, label: 'Downloads', icon: Download },
    { id: 'compression' as const, label: 'Compression', icon: Zap },
    { id: 'advanced' as const, label: 'Advanced', icon: Wrench },
  ]

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "never"}>
    <div className="space-y-8">
      <div className="border-4 border-border bg-card/50">
        <motion.div
          className="border-b-2 border-border p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: ANIMATION_DURATIONS.normal }}
        >
          <h2 className="text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
            <motion.div
              animate={{
                rotate: [0, 180, 180, 0],
              }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <SettingsIcon className="h-6 w-6" />
            </motion.div>
            {!isLoaded ? (
              <ScrambleText text="SETTINGS" delay={1500} scrambleSpeed={12} revealSpeed={20} />
            ) : (
              'SETTINGS'
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wide">
            {!isLoaded ? (
              <ScrambleText text="CONFIGURE YOUR PREFERENCES" delay={1600} scrambleSpeed={12} revealSpeed={18} />
            ) : (
              'CONFIGURE YOUR PREFERENCES'
            )}
          </p>
        </motion.div>

        <div className="grid grid-cols-12">
          <aside className="col-span-3 border-r-2 border-border">
            <nav className="p-2">
              {sections.map((section, index) => (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 + index * 0.1 }}
                  className={`
                    w-full p-4 border-2 transition-all text-left flex items-center gap-3 relative overflow-hidden
                    ${activeSection === section.id 
                      ? 'border-accent bg-accent/10 text-accent' 
                      : 'border-transparent hover:border-border hover:bg-secondary/50'
                    }
                  `}
                  whileHover={{ 
                    x: 6,
                    transition: { duration: 0.1 }
                  }}
                  whileTap={{ 
                    scale: 0.98,
                    x: 8
                  }}
                >
                  {activeSection === section.id && (
                    <motion.div
                      className="absolute inset-0 bg-accent opacity-20"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      exit={{ x: '200%' }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    />
                  )}
                  <section.icon className="h-5 w-5 relative z-10" />
                  <span className="text-sm font-bold uppercase tracking-wider relative z-10">
                    {!isLoaded ? (
                      <ScrambleText 
                        text={section.label} 
                        delay={700 + index * 100} 
                        scrambleSpeed={15} 
                        revealSpeed={20} 
                      />
                    ) : (
                      section.label
                    )}
                  </span>
                </motion.button>
              ))}
            </nav>
          </aside>

          <main className="col-span-9 p-8">
                {activeSection === 'appearance' && <AppearanceSettings isLoaded={isLoaded} />}
                {activeSection === 'downloads' && <DownloadSettings isLoaded={isLoaded} />}
                {activeSection === 'compression' && <CompressionSettings isLoaded={isLoaded} />}
                {activeSection === 'advanced' && <AdvancedSettings isLoaded={isLoaded} />}
          </main>
        </div>
      </div>
    </div>
    </MotionConfig>
  )
}

