import { useState, useRef, useEffect, DragEvent } from 'react'
import { Upload, File, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatBytes } from '@/lib/utils'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  maxSize?: number
  shouldClearFile?: boolean
  onFileClear?: () => void
}

export function FileUploader({ onFileSelect, maxSize, shouldClearFile, onFileClear }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (shouldClearFile) {
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [shouldClearFile])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (maxSize && file.size > maxSize) {
        alert(`File size exceeds ${formatBytes(maxSize)} limit`)
        return
      }
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (maxSize && file.size > maxSize) {
        alert(`File size exceeds ${formatBytes(maxSize)} limit`)
        return
      }
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileClear?.()
  }

  return (
    <div className="space-y-4">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-4 border-dashed transition-all cursor-pointer",
          isDragging ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept="image/*,video/*,.gif"
        />
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-12 text-center"
        >
          <Upload className="mx-auto h-16 w-16 mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-bold uppercase tracking-wider">
              DRAG & DROP FILE HERE
            </p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              OR CLICK TO BROWSE
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-accent bg-accent/5 p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <File className="h-5 w-5 text-accent" />
              <div>
                <p className="font-bold uppercase text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="hover:bg-background p-2 border-2 border-border transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

