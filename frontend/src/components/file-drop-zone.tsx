"use client"

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, X, File } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface FileDropZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
}

export function FileDropZone({ files, onFilesChange, disabled }: FileDropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return
    
    // Filter out files that are too large (10MB limit)
    const validFiles = acceptedFiles.filter(file => file.size <= 10 * 1024 * 1024)
    
    if (validFiles.length !== acceptedFiles.length) {
      // Some files were too large
      console.warn('Some files were too large and were skipped')
    }
    
    onFilesChange([...files, ...validFiles])
  }, [files, onFilesChange, disabled])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    disabled,
  })

  const removeFile = (index: number) => {
    if (disabled) return
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />
    } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
      return <FileText className="h-4 w-4 text-blue-500" />
    } else {
      return <File className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive ? 'Drop files here' : 'Drop your requirements here'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Or click to browse files
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">PDF</Badge>
                <Badge variant="outline">Word (.docx)</Badge>
                <Badge variant="outline">Text (.txt)</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

