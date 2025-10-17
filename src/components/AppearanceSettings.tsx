import { motion, MotionConfig } from 'framer-motion'
import { Sun, Moon, Monitor, Check, Zap } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { useTheme } from '@/lib/useTheme'
import { useAppearanceContext } from '@/lib/AppearanceContext'
import { ANIMATION_DURATIONS } from '@/lib/animationConstants'

interface AppearanceSettingsProps {
  isLoaded: boolean
}

type ThemeOption = {
  id: 'light' | 'dark' | 'system'
  label: string
  description: string
  icon: typeof Sun
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Bright and clean interface',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes',
    icon: Moon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follow system preferences',
    icon: Monitor,
  },
]

export function AppearanceSettings({ isLoaded }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme()
  const { settings, toggleReducedMotion } = useAppearanceContext()

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "never"}>
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATIONS.normal }}
      >
        <h3 className="text-lg font-bold uppercase tracking-wider mb-2">
          {!isLoaded ? (
            <ScrambleText text="THEME" delay={1700} scrambleSpeed={12} revealSpeed={20} />
          ) : (
            'THEME'
          )}
        </h3>
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
          {!isLoaded ? (
            <ScrambleText text="SELECT YOUR PREFERRED COLOR SCHEME" delay={1800} scrambleSpeed={12} revealSpeed={18} />
          ) : (
            'SELECT YOUR PREFERRED COLOR SCHEME'
          )}
        </p>

        <div className="grid grid-cols-1 gap-4">
          {themeOptions.map((option, index) => {
            const isSelected = theme === option.id
            const Icon = option.icon

            return (
              <motion.button
                key={option.id}
                onClick={() => setTheme(option.id)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.1 + index * 0.1 }}
                whileHover={{ 
                  x: 6,
                  transition: { duration: ANIMATION_DURATIONS.fast }
                }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative overflow-hidden border-4 p-6 text-left transition-all
                  ${isSelected 
                    ? 'border-accent bg-accent/10' 
                    : 'border-border hover:border-border hover:bg-secondary/50'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-accent opacity-0"
                    animate={{ opacity: [0, 0.1, 0] }}
                    transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
                  />
                )}

                <div className="flex items-start gap-4 relative z-10">
                  <motion.div
                    className={`
                      border-2 p-3 transition-colors
                      ${isSelected 
                        ? 'border-accent bg-accent/20' 
                        : 'border-border'
                      }
                    `}
                    animate={isSelected ? {
                      scale: [1, 1.05, 1],
                    } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-accent' : ''}`} />
                  </motion.div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-base font-bold uppercase tracking-wider ${isSelected ? 'text-accent' : ''}`}>
                        {!isLoaded ? (
                          <ScrambleText 
                            text={option.label} 
                            delay={1900 + index * 100} 
                            scrambleSpeed={12} 
                            revealSpeed={20} 
                          />
                        ) : (
                          option.label
                        )}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 200, 
                            damping: 15 
                          }}
                        >
                          <Check className="h-4 w-4 text-accent" />
                        </motion.div>
                      )}
                    </div>
                    <p className={`text-sm uppercase tracking-wide ${isSelected ? 'text-accent/70' : 'text-muted-foreground'}`}>
                      {!isLoaded ? (
                        <ScrambleText 
                          text={option.description} 
                          delay={2000 + index * 100} 
                          scrambleSpeed={12} 
                          revealSpeed={18} 
                        />
                      ) : (
                        option.description
                      )}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: ANIMATION_DURATIONS.normal }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.3 }}
        className="border-t-2 border-border pt-8"
      >
        <h3 className="text-lg font-bold uppercase tracking-wider mb-2">
          {!isLoaded ? (
            <ScrambleText text="VISUAL EFFECTS" delay={2300} scrambleSpeed={12} revealSpeed={20} />
          ) : (
            'VISUAL EFFECTS'
          )}
        </h3>
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-6">
          {!isLoaded ? (
            <ScrambleText text="CUSTOMIZE ANIMATIONS AND EFFECTS" delay={2400} scrambleSpeed={12} revealSpeed={18} />
          ) : (
            'CUSTOMIZE ANIMATIONS AND EFFECTS'
          )}
        </p>

        <div className="space-y-4">
          <motion.button
            onClick={toggleReducedMotion}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: ANIMATION_DURATIONS.normal, delay: 0.4 }}
            whileHover={{ 
              x: 6,
              transition: { duration: ANIMATION_DURATIONS.fast }
            }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative overflow-hidden border-4 p-6 text-left transition-all w-full
              ${settings.reducedMotion 
                ? 'border-accent bg-accent/10' 
                : 'border-border hover:border-border hover:bg-secondary/50'
              }
            `}
          >
            {settings.reducedMotion && (
              <motion.div
                className="absolute inset-0 bg-accent opacity-0"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
              />
            )}

            <div className="flex items-start gap-4 relative z-10">
              <motion.div
                className={`
                  border-2 p-3 transition-colors
                  ${settings.reducedMotion 
                    ? 'border-accent bg-accent/20' 
                    : 'border-border'
                  }
                `}
                animate={settings.reducedMotion ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ duration: 0.5 }}
              >
                <Zap className={`h-6 w-6 ${settings.reducedMotion ? 'text-accent' : ''}`} />
              </motion.div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-base font-bold uppercase tracking-wider ${settings.reducedMotion ? 'text-accent' : ''}`}>
                    {!isLoaded ? (
                      <ScrambleText 
                        text="REDUCED MOTION" 
                        delay={2500} 
                        scrambleSpeed={12} 
                        revealSpeed={20} 
                      />
                    ) : (
                      'REDUCED MOTION'
                    )}
                  </span>
                  {settings.reducedMotion && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 15 
                      }}
                    >
                      <Check className="h-4 w-4 text-accent" />
                    </motion.div>
                  )}
                </div>
                <p className={`text-sm uppercase tracking-wide ${settings.reducedMotion ? 'text-accent/70' : 'text-muted-foreground'}`}>
                  {!isLoaded ? (
                    <ScrambleText 
                      text="MINIMIZE ANIMATIONS FOR ACCESSIBILITY" 
                      delay={2600} 
                      scrambleSpeed={12} 
                      revealSpeed={18} 
                    />
                  ) : (
                    'MINIMIZE ANIMATIONS FOR ACCESSIBILITY'
                  )}
                </p>
              </div>
            </div>

            {settings.reducedMotion && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-1 bg-accent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: ANIMATION_DURATIONS.normal }}
              />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
    </MotionConfig>
  )
}

