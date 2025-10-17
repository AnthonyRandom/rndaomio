import { useEffect, useState } from 'react'
import { useAppearanceContext } from '@/lib/AppearanceContext'

interface ScrambleTextProps {
  text: string
  delay?: number
  scrambleSpeed?: number
  revealSpeed?: number
  className?: string
}

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function ScrambleText({ 
  text, 
  delay = 0, 
  scrambleSpeed = 30,
  revealSpeed = 40,
  className = '' 
}: ScrambleTextProps) {
  const { settings } = useAppearanceContext()
  const [displayText, setDisplayText] = useState(
    settings.reducedMotion 
      ? text 
      : text.split('').map(() => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join('')
  )
  const [revealedCount, setRevealedCount] = useState(settings.reducedMotion ? text.length : 0)
  const [isScrambling, setIsScrambling] = useState(!settings.reducedMotion)

  useEffect(() => {
    if (settings.reducedMotion) {
      setDisplayText(text)
      setRevealedCount(text.length)
      setIsScrambling(false)
      return
    }

    const startTime = setTimeout(() => {
      setIsScrambling(false)
    }, delay)

    return () => clearTimeout(startTime)
  }, [delay, settings.reducedMotion, text])

  useEffect(() => {
    if (settings.reducedMotion) return
    
    if (isScrambling) {
      const scrambleInterval = setInterval(() => {
        setDisplayText(text.split('').map((char) => {
          if (char === ' ') return ' '
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }).join(''))
      }, scrambleSpeed)

      return () => clearInterval(scrambleInterval)
    }
  }, [isScrambling, text, scrambleSpeed])

  useEffect(() => {
    if (settings.reducedMotion) return
    
    if (!isScrambling && revealedCount < text.length) {
      const revealTimeout = setTimeout(() => {
        setRevealedCount(prev => prev + 1)
      }, revealSpeed)

      return () => clearTimeout(revealTimeout)
    }
  }, [isScrambling, revealedCount, text.length, revealSpeed, settings.reducedMotion])

  useEffect(() => {
    if (settings.reducedMotion) return
    
    if (!isScrambling && revealedCount < text.length) {
      const scrambleInterval = setInterval(() => {
        const newDisplay = text.split('').map((char, index) => {
          if (index < revealedCount) return char
          if (char === ' ') return ' '
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        }).join('')
        setDisplayText(newDisplay)
      }, scrambleSpeed)

      return () => clearInterval(scrambleInterval)
    } else if (revealedCount >= text.length) {
      setDisplayText(text)
    }
  }, [revealedCount, isScrambling, text, scrambleSpeed, settings.reducedMotion])

  return <span className={className}>{displayText}</span>
}

