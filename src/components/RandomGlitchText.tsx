import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RandomGlitchTextProps {
  children: string
  className?: string
  minDelay?: number
  maxDelay?: number
  speed?: number
}

export function RandomGlitchText({ 
  children, 
  className = '',
  minDelay = 5000,
  maxDelay = 15000,
  speed = 0.3
}: RandomGlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const scheduleNextGlitch = () => {
      const delay = Math.random() * (maxDelay - minDelay) + minDelay
      return setTimeout(() => {
        setIsGlitching(true)
        setTimeout(() => {
          setIsGlitching(false)
          scheduleNextGlitch()
        }, speed * 1000)
      }, delay)
    }

    const timeoutId = scheduleNextGlitch()
    return () => clearTimeout(timeoutId)
  }, [minDelay, maxDelay, speed])

  const inlineStyles = {
    '--after-duration': `${speed * 3}s`,
    '--before-duration': `${speed * 2}s`,
    '--after-shadow': '-3px 0 #ff00de',
    '--before-shadow': '3px 0 #00fff9'
  } as React.CSSProperties

  return (
    <span
      style={inlineStyles}
      data-text={children}
      className={cn(
        'relative inline-block',
        isGlitching && [
          'after:content-[attr(data-text)] after:absolute after:top-0 after:left-[5px] after:overflow-hidden after:[clip-path:inset(0_0_0_0)] after:[text-shadow:var(--after-shadow)] after:animate-glitch-after after:text-[length:inherit] after:font-[inherit] after:leading-[inherit]',
          'before:content-[attr(data-text)] before:absolute before:top-0 before:left-[-5px] before:overflow-hidden before:[clip-path:inset(0_0_0_0)] before:[text-shadow:var(--before-shadow)] before:animate-glitch-before before:text-[length:inherit] before:font-[inherit] before:leading-[inherit]'
        ],
        className
      )}
    >
      {children}
    </span>
  )
}

