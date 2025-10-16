import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button } from './ui/button'
import { Info, VolumeX, MonitorDown } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/lib/animationConstants'

interface InfoModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'info' | 'audio-muted' | 'resolution-reduced'
  details?: string[]
  onClose: () => void
  onProceed?: () => void
  proceedLabel?: string
}

export function InfoModal({
  isOpen,
  title,
  message,
  type = 'info',
  details,
  onClose,
  onProceed,
  proceedLabel = 'OK'
}: InfoModalProps) {
  const getIconAndColors = () => {
    switch (type) {
      case 'audio-muted':
        return {
          Icon: VolumeX,
          borderColor: 'border-cyan-500',
          bgColor: 'bg-cyan-500',
          textColor: 'text-cyan-500'
        }
      case 'resolution-reduced':
        return {
          Icon: MonitorDown,
          borderColor: 'border-cyan-500',
          bgColor: 'bg-cyan-500',
          textColor: 'text-cyan-500'
        }
      default:
        return {
          Icon: Info,
          borderColor: 'border-cyan-500',
          bgColor: 'bg-cyan-500',
          textColor: 'text-cyan-500'
        }
    }
  }

  const { Icon, borderColor, bgColor, textColor } = getIconAndColors()

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <style dangerouslySetInnerHTML={{
        __html: `
          .scan-line, .noise {
            display: none !important;
          }
        `
      }} />
      <motion.div
        key="info-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        key="info-modal-wrapper"
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key="info-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={SPRING_CONFIGS.modal}
          className={`border-4 ${borderColor} bg-card max-w-md w-full p-6 shadow-2xl relative overflow-hidden pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
              <motion.div
                className={`absolute inset-0 ${bgColor} opacity-20`}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                exit={{ x: '200%' }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: ANIMATION_DURATIONS.medium }}
                  >
                    <Icon className={`h-8 w-8 ${textColor}`} />
                  </motion.div>
                  <h2 className={`text-xl font-bold uppercase tracking-wider ${textColor}`}>
                    <ScrambleText
                      text={title}
                      delay={0}
                      scrambleSpeed={15}
                      revealSpeed={30}
                    />
                  </h2>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`border-l-4 ${borderColor} pl-4 py-2`}
                >
                  <p className="text-sm leading-relaxed mb-3">
                    {message}
                  </p>
                  
                  {details && details.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {details.map((detail, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="flex items-start gap-2"
                        >
                          <span className={`${textColor} mt-0.5`}>•</span>
                          <span>{detail}</span>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 pt-2"
                >
                  {onProceed ? (
                    <>
                      <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1"
                      >
                        CLOSE
                      </Button>
                      <Button
                        onClick={onProceed}
                        className={`flex-1 ${bgColor} hover:opacity-90 text-white font-bold`}
                      >
                        {proceedLabel}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={onClose}
                      className="w-full"
                    >
                      {proceedLabel}
                    </Button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
    </AnimatePresence>,
    document.body
  )
}

