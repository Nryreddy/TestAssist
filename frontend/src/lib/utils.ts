import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
    case 'failed':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
    case 'pending':
    case 'uploading':
    case 'reading':
    case 'analyzing':
    case 'generating':
    case 'validating':
    case 'auditing':
    case 'exporting':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
  }
}

export function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950'
    case 'low':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
  }
}

export function getTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case 'functional':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950'
    case 'negative':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950'
    case 'edge':
      return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950'
    case 'security':
      return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950'
    case 'performance':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950'
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950'
  }
}

