"use client"

import { useState, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { convertDocumentToHtml, extractTitleFromFilename } from '@/lib/document-to-html'
import { useToast } from '@/components/ToastContainer'

interface EssayUploaderProps {
  onUploadSuccess: (essayId: string, title: string, content: string) => void
  onUploadError?: (error: string) => void
}

export default function EssayUploader({ onUploadSuccess, onUploadError }: EssayUploaderProps) {
  const toast = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
    const validExtensions = ['pdf', 'docx', 'doc', 'txt']
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension || '')) {
      const error = 'Invalid file type. Please upload PDF, DOCX, DOC, or TXT files.'
      onUploadError?.(error)
      toast.error(error)
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const error = 'File is too large. Maximum size is 10MB.'
      onUploadError?.(error)
      toast.error(error)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(10)

    try {
      // Extract title from filename
      const title = extractTitleFromFilename(selectedFile.name)

      setUploadProgress(30)

      // For PDFs, use server-side processing
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', title)

        setUploadProgress(50)

        const response = await fetch('/api/essays/upload', {
          method: 'POST',
          body: formData
        })

        setUploadProgress(80)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()

        setUploadProgress(100)
        onUploadSuccess(data.essayId, data.title, data.content)
      } else {
        // For DOCX/DOC/TXT, convert client-side
        const conversionResult = await convertDocumentToHtml(selectedFile)

        setUploadProgress(60)

        if (!conversionResult.success) {
          throw new Error(conversionResult.error || 'Failed to convert document')
        }

        // Save to database via API
        const response = await fetch('/api/essays/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            content: conversionResult.html,
            plainText: conversionResult.plainText,
            wordCount: conversionResult.wordCount
          })
        })

        setUploadProgress(80)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()

        setUploadProgress(100)
        onUploadSuccess(data.essayId, data.title, conversionResult.html)
      }

      // Reset state
      setTimeout(() => {
        setSelectedFile(null)
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
      onUploadError?.(errorMessage)
      toast.error(errorMessage)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-accent-primary bg-accent-primary/10 scale-105'
              : 'border-gray-300 dark:border-gray-600 hover:border-accent-primary hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileInputChange}
            className="hidden"
            id="essay-file-input"
          />

          <label htmlFor="essay-file-input" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full">
                <Upload className="w-8 h-8 text-white" />
              </div>

              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Upload Your Essay
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop or click to browse
                </p>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-500">
                Supports: PDF, DOCX, DOC, TXT (max 10MB)
              </div>
            </div>
          </label>
        </div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-white dark:bg-gray-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Uploading...</span>
                <span className="text-xs font-medium text-accent-primary">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload & Start Editing'}
          </button>
        </div>
      )}
    </div>
  )
}
