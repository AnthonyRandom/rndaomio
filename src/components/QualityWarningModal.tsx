import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button } from './ui/button'
import { AlertTriangle } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/lib/animationConstants'

interface QualityWarningModalProps {
  isOpen: boolean
  qualityLoss: number
  warningMessage: string
  onProceed: () => void
  onCancel: () => void
}

export function QualityWarningModal({
  isOpen,
  qualityLoss,
  warningMessage,
  onProceed,
  onCancel
}: QualityWarningModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              .scan-line, .noise {
                display: none !important;
              }
            `
          }} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/80 backdrop-blur-sm"
            style={{
              zIndex: 99999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              margin: 0,
              padding: 0,
              border: 'none',
              outline: 'none'
            }}
            onClick={onCancel}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={SPRING_CONFIGS.modal}
            className="border-4 border-yellow-500 bg-card max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
              <motion.div
                className="absolute inset-0 bg-yellow-500 opacity-0"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: ANIMATION_DURATIONS.scanLine, repeat: Infinity }}
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
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  </motion.div>
                  <h2 className="text-xl font-bold uppercase tracking-wider">
                    <ScrambleText
                      text="QUALITY WARNING"
                      delay={0}
                      scrambleSpeed={15}
                      revealSpeed={30}
                    />
                  </h2>
                </div>

                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="border-l-4 border-yellow-500 pl-4 py-2"
                  >
                    <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                      COMPRESSION IMPACT
                    </p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {qualityLoss.toFixed(0)}% SIZE REDUCTION
                    </p>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm leading-relaxed"
                  >
                    {warningMessage}
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-muted-foreground uppercase tracking-wide"
                  >
                    This level of compression may result in visible artifacts, blurriness, or color banding.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex gap-3 pt-2"
                >
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={onProceed}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                  >
                    PROCEED ANYWAY
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

