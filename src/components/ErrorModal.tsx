import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button } from './ui/button'
import { XCircle } from 'lucide-react'
import { ScrambleText } from './ScrambleText'
import { ANIMATION_DURATIONS, SPRING_CONFIGS } from '@/lib/animationConstants'

interface ErrorModalProps {
  isOpen: boolean
  title: string
  message: string
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
}

export function ErrorModal({
  isOpen,
  title,
  message,
  onClose,
  actionLabel,
  onAction
}: ErrorModalProps) {
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
        key="error-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        key="error-modal-wrapper"
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key="error-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={SPRING_CONFIGS.modal}
          className="border-4 border-red-500 bg-card max-w-md w-full p-6 shadow-2xl relative overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
              <motion.div
                className="absolute inset-0 bg-red-500 opacity-20"
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
                    <XCircle className="h-8 w-8 text-red-500" />
                  </motion.div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-red-500">
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
                  className="border-l-4 border-red-500 pl-4 py-2"
                >
                  <p className="text-sm leading-relaxed">
                    {message}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-3 pt-2"
                >
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    CLOSE
                  </Button>
                  {actionLabel && onAction && (
                    <Button
                      onClick={onAction}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                    >
                      {actionLabel}
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

