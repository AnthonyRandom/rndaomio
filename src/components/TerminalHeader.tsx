import { motion } from 'framer-motion'
import { Circle } from 'lucide-react'

export function TerminalHeader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 mb-4"
    >
      <div className="flex gap-2">
        <Circle className="h-3 w-3 fill-red-500 text-red-500" />
        <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
        <Circle className="h-3 w-3 fill-green-500 text-green-500" />
      </div>
      <div className="flex-1 border-b-2 border-border" />
    </motion.div>
  )
}

