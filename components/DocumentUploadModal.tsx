"use client"

import { useState, useRef, ChangeEvent } from "react"
import { X, Upload, FileText, Loader2, Link as LinkIcon } from "lucide-react"

// Note: PDF.js is dynamically imported in extractTextFromPDF() to avoid webpack bundling issues

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type UploadTab = 'file' | 'url'

// Chunk size for large file uploads (4MB - stays under Vercel's 4.5MB limit)
const CHUNK_SIZE = 4 * 1024 * 1024
// Threshold for using chunked upload (5MB - triggers for textbooks)
const CHUNKED_UPLOAD_THRESHOLD = 5 * 1024 * 1024
// Number of parallel chunk uploads (increased for faster uploads)
const PARALLEL_CHUNKS = 4

interface UploadProgress {
  uploadedChunks: number
  totalChunks: number
  percentage: number
  status?: string // e.g., "Uploading...", "Extracting text from PDF..."
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'application/json'
      ]

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload PDF, DOCX, DOC, TXT, or JSON files.')
        return
      }

      // Validate file size (500MB limit)
      const maxSize = 500 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError('File size exceeds 500MB limit.')
        return
      }

      setFile(selectedFile)
      setError(null)
    }
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
      // Create a synthetic event to reuse validation logic
      const syntheticEvent = {
        target: { files: [droppedFile] }
      } as ChangeEvent<HTMLInputElement>
      handleFileChange(syntheticEvent)
    }
  }

  /**
   * Extract text from PDF file using client-side PDF.js processing
   * Sends extracted text to server after completion
   */
  const extractTextFromPDF = async (file: File, documentId: string): Promise<void> => {
    console.log(`🔍 Starting PDF text extraction for ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`)

    try {
      // Only process PDFs
      if (file.type !== 'application/pdf') {
        console.log('⚠️ Skipping text extraction - not a PDF file')
        return
      }

      setUploadProgress({
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 0,
        status: 'Loading PDF library...'
      })

      // Dynamically import PDF.js to avoid webpack bundling issues
      console.log('📚 Importing PDF.js library...')
      const pdfjsLib = await import('pdfjs-dist')

      // Configure worker after import
      // Use local API endpoint to avoid CORS issues and leverage fallback logic
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/api/pdf-worker'
      console.log('📄 PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc)

      setUploadProgress({
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 0,
        status: 'Loading PDF in browser...'
      })

      // Load PDF in browser
      console.log('📄 Loading PDF document...')
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })

      // Add progress callback for large PDFs
      loadingTask.onProgress = (progress: any) => {
        const percentLoaded = Math.round((progress.loaded / progress.total) * 100)
        console.log(`📥 PDF loading progress: ${percentLoaded}%`)
      }

      const pdf = await loadingTask.promise
      const totalPages = pdf.numPages
      console.log(`✅ PDF loaded successfully: ${totalPages} pages`)

      let extractedText = ''
      const startTime = Date.now()

      // Extract text from each page
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        extractedText += pageText + '\n\n'

        // Update progress
        const percentage = Math.round((i / totalPages) * 100)
        setUploadProgress({
          uploadedChunks: 0,
          totalChunks: 0,
          percentage,
          status: `Extracting text... page ${i}/${totalPages}`
        })

        // Log progress every 10 pages for large PDFs
        if (i % 10 === 0 || i === totalPages) {
          console.log(`📄 Extracted ${i}/${totalPages} pages (${extractedText.length} chars so far)`)
        }
      }

      const extractionTime = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`✅ Text extraction complete: ${extractedText.length} characters in ${extractionTime}s`)

      // Check for empty extraction (scanned PDFs)
      if (extractedText.trim().length < 100) {
        console.warn('⚠️ Very little text extracted - this might be a scanned PDF')
        throw new Error('This appears to be a scanned PDF with no extractable text. Please use a text-based PDF or enable OCR.')
      }

      // Send extracted text to server
      setUploadProgress({
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 100,
        status: 'Saving to database...'
      })

      console.log('💾 Sending extracted text to server...')
      const response = await fetch('/api/documents/update-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          extractedText,
          pageCount: totalPages
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }))
        console.error('❌ Server error:', errorData)
        throw new Error(`Server error: ${errorData.error || 'Failed to save extracted text'}`)
      }

      const result = await response.json()
      console.log(`✅ Document processing complete!`, result)

    } catch (error) {
      console.error('❌ PDF extraction failed:', error)

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF')) {
          throw new Error('Invalid PDF file. The file may be corrupted or password-protected.')
        } else if (error.message.includes('scanned PDF')) {
          throw error // Already has good message
        } else if (error.message.includes('Worker')) {
          throw new Error('PDF worker failed to load. Please check your internet connection and try again.')
        } else {
          throw new Error(`PDF extraction failed: ${error.message}`)
        }
      }

      throw new Error('Unknown error occurred during PDF processing')
    }
  }

  /**
   * Upload file using chunked upload for large files (>50MB)
   * or regular upload for smaller files (≤50MB)
   * For PDFs uploaded via chunked upload, extracts text client-side after upload
   */
  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(null)

    try {
      // Determine upload strategy based on file size
      const useLargeFileUpload = file.size > CHUNKED_UPLOAD_THRESHOLD
      console.log(`📊 Upload strategy: ${useLargeFileUpload ? 'CHUNKED' : 'REGULAR'} (file size: ${(file.size / (1024 * 1024)).toFixed(2)} MB, threshold: ${(CHUNKED_UPLOAD_THRESHOLD / (1024 * 1024)).toFixed(2)} MB)`)

      if (useLargeFileUpload) {
        // Use chunked upload for large files (>5MB)
        console.log(`🚀 Starting chunked upload for ${file.name}...`)
        const documentId = await uploadLargeFile(file)
        console.log(`🔍 DEBUG: uploadLargeFile returned documentId:`, documentId)

        // Extract text from PDF client-side (if PDF and we have documentId)
        if (documentId && file.type === 'application/pdf') {
          console.log(`🔍 DEBUG: Calling extractTextFromPDF with documentId: ${documentId}`)
          await extractTextFromPDF(file, documentId)
        } else {
          console.log(`⚠️ DEBUG: Skipping extraction - documentId: ${documentId}, fileType: ${file.type}`)
        }
      } else {
        // Use regular upload for small files (≤5MB)
        console.log(`🚀 Starting regular upload for ${file.name}...`)
        await uploadSmallFile(file)
      }

      // Success - close modal and refresh documents
      console.log(`✅ Upload complete! Calling onSuccess() and closing modal`)
      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Upload error:', err)

      // Provide specific error messages based on error type
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Upload timed out after 5 minutes. Please try a smaller file or check your internet connection.')
        } else if (err.message === 'Failed to fetch') {
          setError('Network error. Please check if the server is running and try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to upload document. Please try again.')
      }
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  /**
   * Upload small files (≤5MB) to Supabase Storage via /api/documents
   * For PDFs: Uploads file, then extracts text client-side (consistent with large file handling)
   * For other types: Server handles text extraction
   */
  const uploadSmallFile = async (file: File): Promise<void> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    try {
      console.log(`📤 Uploading small file via /api/documents: ${file.name}`)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload document')
      }

      const result = await response.json()
      console.log(`✅ Small file uploaded successfully:`, result)

      // For PDFs, override server-side extraction with client-side extraction
      // This ensures consistent behavior between small and large PDFs
      if (file.type === 'application/pdf' && result.document?.id) {
        console.log(`🔄 Overriding with client-side PDF extraction for consistency`)
        await extractTextFromPDF(file, result.document.id)
      }

    } catch (err) {
      clearTimeout(timeout)
      throw err
    }
  }

  /**
   * Upload large files (>50MB) to Cloudflare R2 via /api/upload-large-document
   * Uses parallel chunked upload with progress tracking for faster uploads
   * Returns documentId for subsequent processing
   */
  const uploadLargeFile = async (file: File): Promise<string | null> => {
    const fileSize = file.size
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

    // Initialize progress
    setUploadProgress({
      uploadedChunks: 0,
      totalChunks,
      percentage: 0,
      status: 'Uploading...'
    })

    let uploadedChunks = 0
    let documentId: string | null = null

    const updateProgress = () => {
      const percentage = Math.round((uploadedChunks / totalChunks) * 100)
      setUploadProgress({
        uploadedChunks,
        totalChunks,
        percentage,
        status: 'Uploading...'
      })
    }

    // Upload chunks in parallel batches for faster upload
    const uploadChunk = async (chunkIndex: number, retryCount = 0): Promise<any> => {
      const MAX_RETRIES = 3
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, fileSize)
      const chunk = file.slice(start, end)

      try {
        // Create form data for this chunk
        const formData = new FormData()
        formData.append('file', chunk)
        formData.append('chunkIndex', chunkIndex.toString())
        formData.append('totalChunks', totalChunks.toString())
        formData.append('fileName', file.name)

        console.log(`📤 Uploading chunk ${chunkIndex + 1}/${totalChunks} (attempt ${retryCount + 1})`)

        // Upload chunk with 60s timeout per chunk
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)

        const response = await fetch('/api/upload-large-document', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))

          // If it's a setup error, show detailed message
          if (errorData.setupRequired) {
            throw new Error(`${errorData.error}\n\n${errorData.details}`)
          }

          throw new Error(errorData.error || 'Upload failed')
        }

        const data = await response.json()
        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`)

        // Update progress atomically (increment then update UI)
        uploadedChunks++
        updateProgress()

        return data

      } catch (error) {
        console.error(`❌ Chunk ${chunkIndex + 1} failed:`, error)

        // Retry on failure (network issues, timeouts)
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying chunk ${chunkIndex + 1} (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
          return uploadChunk(chunkIndex, retryCount + 1)
        }

        // Max retries exceeded
        throw new Error(`Failed to upload chunk ${chunkIndex + 1} after ${MAX_RETRIES + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Upload chunks in parallel batches
    for (let i = 0; i < totalChunks; i += PARALLEL_CHUNKS) {
      const batch = []
      for (let j = 0; j < PARALLEL_CHUNKS && i + j < totalChunks; j++) {
        batch.push(uploadChunk(i + j))
      }
      const results = await Promise.all(batch)

      // Check if any result contains the documentId (from last chunk)
      for (const result of results) {
        console.log(`🔍 DEBUG: Checking batch result:`, result)
        // Check both top-level documentId and nested processing.documentId
        if (result.documentId || result.processing?.documentId) {
          documentId = result.documentId || result.processing.documentId
          console.log(`🎯 DEBUG: Found documentId in batch result: ${documentId}`)
        }
      }
    }

    console.log(`🔍 DEBUG: uploadLargeFile completing with documentId: ${documentId}`)

    // Defensive check: ensure we got a documentId from server
    if (!documentId) {
      console.error('❌ CRITICAL: Upload completed but documentId is null/undefined')
      console.error('This usually means the server response is missing the documentId field')
      throw new Error('Upload succeeded but document ID was not returned from server. Please refresh the page and try again.')
    }

    return documentId
  }

  const handleImportFromUrl = async () => {
    if (!url.trim()) return

    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch('/api/import-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import content from URL')
      }

      // Success - close modal and refresh documents
      onSuccess()
      handleClose()
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import content from URL')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setUrl('')
      setError(null)
      setActiveTab('file')
      onClose()
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Add Document
            </h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab('file')
                setError(null)
              }}
              disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'file'
                  ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              } disabled:opacity-50`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <button
              onClick={() => {
                setActiveTab('url')
                setError(null)
              }}
              disabled={isUploading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              } disabled:opacity-50`}
            >
              <LinkIcon className="w-4 h-4" />
              Import from URL
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File Upload Tab */}
          {activeTab === 'file' && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.json"
                  className="hidden"
                  disabled={isUploading}
                />

                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-black dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setError(null)
                      }}
                      disabled={isUploading}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-black dark:text-white mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PDF, DOCX, DOC, TXT, or JSON (max 500MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {uploadProgress.status || `Uploading chunk ${uploadProgress.uploadedChunks}/${uploadProgress.totalChunks}`}
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {uploadProgress.percentage}%
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  After uploading, you'll be able to choose how to study this document: generate flashcards, chat with it, create a podcast, or build a mind map.
                </p>
                {file && file.size > CHUNKED_UPLOAD_THRESHOLD && (
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                    <strong>Large file detected ({formatFileSize(file.size)}):</strong> This will use chunked upload to Cloudflare R2 storage and ChromaDB vector indexing for optimal performance.
                  </p>
                )}
              </div>
            </>
          )}

          {/* URL Import Tab */}
          {activeTab === 'url' && (
            <>
              {/* URL Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enter URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/2103.15691"
                  disabled={isUploading}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUploading && url.trim()) {
                      handleImportFromUrl()
                    }
                  }}
                />
              </div>

              {/* Supported Sources */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Supported Sources:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• arXiv papers (arxiv.org)</li>
                  <li>• Medium articles</li>
                  <li>• Blog posts and web articles</li>
                  <li>• PDF documents (direct links)</li>
                  <li>• YouTube videos (coming soon)</li>
                </ul>
              </div>
            </>
          )}

          {/* Error message (shared) */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          {activeTab === 'file' ? (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleImportFromUrl}
              disabled={!url.trim() || isUploading}
              className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <LinkIcon className="w-5 h-5" />
                  Import
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
