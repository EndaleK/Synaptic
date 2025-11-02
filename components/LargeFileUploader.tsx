"use client"

/**
 * Large File Uploader Component
 *
 * Handles chunked uploads for files up to 500GB
 * - Splits files into 10MB chunks
 * - Shows upload progress
 * - Automatically processes and indexes after upload
 * - Supports resume on failure (future enhancement)
 */

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

interface UploadProgress {
  fileName: string
  fileSize: number
  uploadedChunks: number
  totalChunks: number
  percentage: number
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  documentId?: string
}

interface LargeFileUploaderProps {
  onUploadComplete?: (documentId: string, fileName: string) => void
  onError?: (error: string) => void
  maxFileSizeMB?: number // Default: 500MB
  acceptedTypes?: string[]
}

export default function LargeFileUploader({
  onUploadComplete,
  onError,
  maxFileSizeMB = 500,
  acceptedTypes = ['.pdf', '.docx', '.txt'],
}: LargeFileUploaderProps) {
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Upload file in chunks
   */
  const uploadFile = useCallback(async (file: File) => {
    const fileSize = file.size
    const maxSize = maxFileSizeMB * 1024 * 1024

    // Validate file size
    if (fileSize > maxSize) {
      const errorMsg = `File too large. Maximum size is ${maxFileSizeMB}MB`
      setProgress({
        fileName: file.name,
        fileSize,
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 0,
        status: 'error',
        error: errorMsg,
      })
      onError?.(errorMsg)
      return
    }

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

    // Initialize progress
    setProgress({
      fileName: file.name,
      fileSize,
      uploadedChunks: 0,
      totalChunks,
      percentage: 0,
      status: 'uploading',
    })

    try {
      let uploadedChunks = 0

      // Upload chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, fileSize)
        const chunk = file.slice(start, end)

        // Create form data for this chunk
        const formData = new FormData()
        formData.append('file', chunk)
        formData.append('chunkIndex', chunkIndex.toString())
        formData.append('totalChunks', totalChunks.toString())
        formData.append('fileName', file.name)

        // Upload chunk
        const response = await fetch('/api/upload-large-document', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        const data = await response.json()

        uploadedChunks++
        const percentage = Math.round((uploadedChunks / totalChunks) * 100)

        // Update progress
        setProgress((prev) => ({
          ...prev!,
          uploadedChunks,
          percentage,
          status: data.isComplete ? 'processing' : 'uploading',
          documentId: data.documentId,
        }))

        // If complete, wait for processing
        if (data.isComplete && data.processing) {
          setProgress((prev) => ({
            ...prev!,
            status: 'completed',
            documentId: data.processing.documentId,
          }))

          onUploadComplete?.(data.processing.documentId, file.name)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed'
      setProgress((prev) => ({
        ...prev!,
        status: 'error',
        error: errorMsg,
      }))
      onError?.(errorMsg)
    }
  }, [maxFileSizeMB, onUploadComplete, onError])

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        uploadFile(file)
      }
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Upload Area */}
      {!progress || progress.status === 'completed' || progress.status === 'error' ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-accent-primary bg-accent-primary/5'
              : 'border-gray-300 dark:border-gray-600 hover:border-accent-primary dark:hover:border-accent-primary'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Upload Large Document
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Drag and drop or click to select a file
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Supports PDF, DOCX, TXT up to {maxFileSizeMB}MB
          </p>
          <input
            id="file-input"
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : null}

      {/* Progress Display */}
      {progress && (progress.status === 'uploading' || progress.status === 'processing') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <FileText className="w-10 h-10 text-accent-primary flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {progress.fileName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {(progress.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div
                  className="bg-gradient-to-r from-accent-primary to-accent-secondary h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {/* Status Text */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {progress.status === 'uploading' &&
                    `Uploading chunk ${progress.uploadedChunks}/${progress.totalChunks}`}
                  {progress.status === 'processing' && 'Processing and indexing document...'}
                </span>
                <span className="font-semibold text-accent-primary">
                  {progress.percentage}%
                </span>
              </div>
            </div>
            <Loader2 className="w-5 h-5 text-accent-primary animate-spin flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress && progress.status === 'completed' && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Upload Complete!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {progress.fileName} has been successfully uploaded and indexed. You can now use it
                for flashcards, chat, podcast, or mind maps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {progress && progress.status === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Upload Failed
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {progress.error || 'An unknown error occurred during upload.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
