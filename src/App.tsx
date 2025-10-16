import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CompressorTool } from './components/CompressorTool'
import { MediaDownloader } from './components/MediaDownloader'
import { ScrambleText } from './components/ScrambleText'
import { Terminal, Zap, FileCode, Image, Settings, Download } from 'lucide-react'

function App() {
  const [currentTool, setCurrentTool] = useState('downloader')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 1000)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div className="scan-line" />
      
      <div className="relative z-10 flex-1 flex flex-col">
        <header className="border-b-4 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="border-4 border-primary p-2"
                  whileHover={{ 
                    scale: [1, 1.1, 0.95, 1.05, 1],
                    rotate: [0, -5, 5, 0],
                    borderColor: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--primary))']
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Terminal className="h-8 w-8" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold uppercase tracking-wider">
                    {!isLoaded ? (
                      <ScrambleText text="RNDAOMIO" delay={100} scrambleSpeed={20} revealSpeed={30} />
                    ) : (
                      'RNDAOMIO'
                    )}
                  </h1>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    {!isLoaded ? (
                      <ScrambleText text="MULTIMEDIA TOOLKIT v1.0" delay={300} scrambleSpeed={20} revealSpeed={30} />
                    ) : (
                      'MULTIMEDIA TOOLKIT v1.0'
                    )}
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-12 flex-1">
          <div className="grid grid-cols-12 gap-8">
            <aside className="col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="border-4 border-border bg-card/50 sticky top-28"
              >
                <div className="border-b-2 border-border p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {!isLoaded ? (
                      <ScrambleText text="TOOLS MENU" delay={600} scrambleSpeed={15} revealSpeed={25} />
                    ) : (
                      'TOOLS MENU'
                    )}
                  </h2>
                </div>
                
                <nav className="p-2">
                  {[
                    { id: 'downloader', label: 'Media Downloader', icon: Download, active: true },
                    { id: 'compressor', label: 'File Compressor', icon: Zap, active: true },
                    { id: 'converter', label: 'Format Converter', icon: FileCode, active: false },
                    { id: 'optimizer', label: 'Image Optimizer', icon: Image, active: false },
                    { id: 'settings', label: 'Settings', icon: Settings, active: false },
                  ].map((tool, index) => (
                    <motion.button
                      key={tool.id}
                      onClick={() => setCurrentTool(tool.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.3 + index * 0.1 }}
                      className={`
                        w-full p-4 border-2 transition-all text-left flex items-center gap-3 relative overflow-hidden
                        ${currentTool === tool.id 
                          ? 'border-accent bg-accent/10 text-accent' 
                          : 'border-transparent hover:border-border hover:bg-secondary/50'
                        }
                        ${!tool.active && 'opacity-50 cursor-not-allowed'}
                      `}
                      whileHover={tool.active ? { 
                        x: 6,
                        transition: { duration: 0.1 }
                      } : {}}
                      whileTap={tool.active ? { 
                        scale: 0.98,
                        x: 8
                      } : {}}
                      disabled={!tool.active}
                    >
                      <AnimatePresence mode="wait">
                        {currentTool === tool.id && (
                          <motion.div
                            className="absolute inset-0 bg-accent opacity-20"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            exit={{ x: '200%' }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                          />
                        )}
                      </AnimatePresence>
                      <tool.icon className="h-5 w-5 relative z-10" />
                      <span className="text-sm font-bold uppercase tracking-wider relative z-10">
                        {!isLoaded ? (
                          <ScrambleText 
                            text={tool.label} 
                            delay={700 + index * 100} 
                            scrambleSpeed={15} 
                            revealSpeed={20} 
                          />
                        ) : (
                          tool.label
                        )}
                      </span>
                      {!tool.active && (
                        <motion.span 
                          className="ml-auto text-xs relative z-10"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          SOON
                        </motion.span>
                      )}
                    </motion.button>
                  ))}
                </nav>
              </motion.div>
            </aside>

            <main className="col-span-9">
              {currentTool === 'downloader' && <MediaDownloader isLoaded={isLoaded} />}
              {currentTool === 'compressor' && <CompressorTool isLoaded={isLoaded} />}
            </main>
          </div>
        </div>

        <footer className="border-t-4 border-border bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {!isLoaded ? (
                      <ScrambleText text="VERSION" delay={1100} scrambleSpeed={15} revealSpeed={20} />
                    ) : (
                      'VERSION'
                    )}
                  </p>
                  <p className="text-sm font-bold uppercase">
                    {!isLoaded ? (
                      <ScrambleText text="v1.0.0" delay={1200} scrambleSpeed={15} revealSpeed={20} />
                    ) : (
                      'v1.0.0'
                    )}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {!isLoaded ? (
                    <ScrambleText text="BUILT WITH BRUTALISM" delay={1300} scrambleSpeed={15} revealSpeed={20} />
                  ) : (
                    'BUILT WITH BRUTALISM'
                  )}
                </p>
                <p className="text-sm font-bold uppercase">
                  {!isLoaded ? (
                    <ScrambleText text="© 2025 RNDAOMIO" delay={1400} scrambleSpeed={15} revealSpeed={20} />
                  ) : (
                    '© 2025 RNDAOMIO'
                  )}
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App

