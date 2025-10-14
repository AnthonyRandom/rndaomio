import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatFileSizeMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2)
}

export function getTargetSizeMB(targetSizeBytes: number): string {
  return (targetSizeBytes / (1024 * 1024)).toFixed(0)
}

export function isFileAlreadyUnderLimit(fileSize: number, targetSizeBytes: number): boolean {
  return fileSize <= targetSizeBytes
}

