import { motion } from 'framer-motion'
import { Activity, Cpu, HardDrive } from 'lucide-react'
import { useEffect, useState } from 'react'

export function SystemStats() {
  const [cpuUsage, setCpuUsage] = useState(0)
  const [memUsage, setMemUsage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 40 + 20))
      setMemUsage(Math.floor(Math.random() * 30 + 40))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-4"
    >
      {[
        { label: 'STATUS', value: 'ONLINE', icon: Activity, color: 'text-green-500' },
        { label: 'CPU', value: `${cpuUsage}%`, icon: Cpu, color: 'text-blue-400' },
        { label: 'MEMORY', value: `${memUsage}%`, icon: HardDrive, color: 'text-yellow-400' },
      ].map((stat) => (
        <div
          key={stat.label}
          className="border-2 border-border bg-secondary/50 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <div className={`text-lg font-bold uppercase ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

