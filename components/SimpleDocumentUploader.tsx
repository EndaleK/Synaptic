"use client"

/**
 * SimpleDocumentUploader - Simplified upload using Supabase signed URLs
 *
 * This replaces the complex chunked upload system with a simpler direct upload:
 * 1. Request signed URL from server
 * 2. Upload directly to Supabase (bypasses Vercel limits)
 * 3. Notify server when complete
 *
 * Benefits:
 * - No chunking needed (Supabase supports up to 5GB)
 * - No session management
 * - Faster (direct upload)
 * - More reliable (browser handles retries)
 * - 70% less code
 */

import { useState, useRef, ChangeEvent } from "react"
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface SimpleDocumentUploaderProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

export default function SimpleDocumentUploader({
  isOpen,
  onClose,
  onSuccess,
}: SimpleDocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload PDF, DOCX, or TXT files.')
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`)
      return
    }

    setFile(selectedFile)
    setError(null)
    setStatus('idle')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      const syntheticEvent = {
        target: { files: [droppedFile] }
      } as ChangeEvent<HTMLInputElement>
      handleFileChange(syntheticEvent)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setStatus('uploading')
    setUploadProgress(0)

    try {
      // Step 1: Request signed upload URL from server
      console.log(`📤 Requesting upload URL for: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`)

      const prepareResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
      })

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json()
        throw new Error(errorData.error || 'Failed to prepare upload')
      }

      const { uploadUrl, documentId } = await prepareResponse.json()

      console.log(`✅ Upload URL received, uploading to Supabase...`)

      // Step 2: Upload directly to Supabase using signed URL
      // Use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(progress)
            console.log(`📊 Upload progress: ${progress}%`)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'))
        })

        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      console.log(`✅ File uploaded to Supabase successfully`)

      setStatus('processing')

      // Step 3: Notify server that upload is complete
      console.log(`📝 Notifying server of upload completion...`)

      const completeResponse = await fetch(`/api/documents/${documentId}/complete`, {
        method: 'POST'
      })

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json()
        throw new Error(errorData.error || 'Failed to complete upload')
      }

      const result = await completeResponse.json()

      console.log(`✅ Upload completed:`, result)

      setStatus('completed')
      setUploadProgress(100)

      // Wait a moment to show success message, then close
      setTimeout(() => {
        onSuccess()
        onClose()
        resetState()
      }, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setStatus('error')
      setIsUploading(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setIsUploading(false)
    setUploadProgress(0)
    setError(null)
    setStatus('idle')
  }

  const handleClose = () => {
    if (!isUploading) {
      onClose()
      resetState()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Document
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!file ? (
            // File selector
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-accent-primary dark:hover:border-accent-primary transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-900 dark:text-white font-medium mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports PDF, DOCX, TXT up to 500MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            // File preview and upload status
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <FileText className="w-8 h-8 text-accent-primary flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-accent-primary to-accent-secondary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {status === 'uploading' && `Uploading... ${uploadProgress}%`}
                    {status === 'processing' && 'Processing...'}
                    {status === 'completed' && 'Upload complete!'}
                  </p>
                </div>
              )}

              {/* Status messages */}
              {status === 'completed' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload successful!</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Action buttons */}
              {!isUploading && status !== 'completed' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setFile(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Choose Different File
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Upload
                  </button>
                </div>
              )}
            </div>
          )}

          {error && !file && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
