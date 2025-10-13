import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface GlitchTextProps {
  text: string
  className?: string
  glitchFrequency?: number
}

export function GlitchText({ text, className = '', glitchFrequency = 3000 }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true)
      setTimeout(() => setIsGlitching(false), 200)
    }, glitchFrequency)

    return () => clearInterval(glitchInterval)
  }, [glitchFrequency])

  return (
    <div className="relative inline-block">
      <motion.span
        className={className}
        animate={isGlitching ? {
          x: [0, -2, 3, -1, 2, 0],
          y: [0, 1, -2, 2, -1, 0],
        } : {}}
        transition={{ duration: 0.2 }}
      >
        {text}
      </motion.span>
      
      {isGlitching && (
        <>
          <motion.span
            className={`${className} absolute top-0 left-0 text-red-500 opacity-70`}
            style={{ mixBlendMode: 'screen' }}
            initial={{ x: -2, y: 0 }}
            animate={{ x: 2, y: 0 }}
            transition={{ duration: 0.1, repeat: 1, repeatType: 'reverse' }}
          >
            {text}
          </motion.span>
          <motion.span
            className={`${className} absolute top-0 left-0 text-cyan-500 opacity-70`}
            style={{ mixBlendMode: 'screen' }}
            initial={{ x: 2, y: 0 }}
            animate={{ x: -2, y: 0 }}
            transition={{ duration: 0.1, repeat: 1, repeatType: 'reverse' }}
          >
            {text}
          </motion.span>
        </>
      )}
    </div>
  )
}

