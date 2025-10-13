import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface GlitchIconProps {
  icons: LucideIcon[]
  className?: string
  glitchDuration?: number
  glitchInterval?: number
}

export function GlitchIcon({ 
  icons, 
  className = '', 
  glitchDuration = 300,
  glitchInterval = 5000 
}: GlitchIconProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGlitching, setIsGlitching] = useState(false)
  const CurrentIcon = icons[currentIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true)
      const shuffleInterval = setInterval(() => {
        setCurrentIndex(Math.floor(Math.random() * icons.length))
      }, 100)

      setTimeout(() => {
        clearInterval(shuffleInterval)
        setCurrentIndex(0)
        setIsGlitching(false)
      }, glitchDuration)
    }, glitchInterval)

    return () => clearInterval(interval)
  }, [icons.length, glitchDuration, glitchInterval])

  return (
    <motion.div
      animate={isGlitching ? {
        scale: [1, 1.1, 0.9, 1.05, 1],
        rotate: [0, -5, 5, -3, 0],
        opacity: [1, 0.7, 1, 0.8, 1],
      } : {}}
      transition={{ duration: 0.3 }}
    >
      <CurrentIcon className={className} />
    </motion.div>
  )
}

