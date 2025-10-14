// Animation duration constants for consistency across the app
export const ANIMATION_DURATIONS = {
  fast: 0.1,
  normal: 0.3,
  medium: 0.5,
  slow: 0.6,
  verySlow: 1.5,
  scanLine: 2,
  scanLineRepeat: 4,
} as const

export const ANIMATION_REPEATS = {
  infinite: Infinity,
  twice: 2,
  thrice: 3,
} as const

export const SPRING_CONFIGS = {
  button: {
    type: "spring" as const,
    stiffness: 200,
    damping: 15,
  },
  modal: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
  },
  success: {
    type: "spring" as const,
    stiffness: 150,
    damping: 12,
  },
} as const
