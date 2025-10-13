import { useEffect, useState } from 'react'

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
  const [displayText, setDisplayText] = useState(text.split('').map(() => 
    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  ).join(''))
  const [revealedCount, setRevealedCount] = useState(0)
  const [isScrambling, setIsScrambling] = useState(true)

  useEffect(() => {
    const startTime = setTimeout(() => {
      setIsScrambling(false)
    }, delay)

    return () => clearTimeout(startTime)
  }, [delay])

  useEffect(() => {
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
    if (!isScrambling && revealedCount < text.length) {
      const revealTimeout = setTimeout(() => {
        setRevealedCount(prev => prev + 1)
      }, revealSpeed)

      return () => clearTimeout(revealTimeout)
    }
  }, [isScrambling, revealedCount, text.length, revealSpeed])

  useEffect(() => {
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
  }, [revealedCount, isScrambling, text, scrambleSpeed])

  return <span className={className}>{displayText}</span>
}

