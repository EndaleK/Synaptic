'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BookOpen,
  User,
  X
} from 'lucide-react'

interface ParsedExam {
  name: string
  date: string | null
  weight: number | null
  topics: string[]
}

interface ParsedTopic {
  name: string
  chapters: string[]
  weight: number | null
  estimatedHours: number | null
}

interface SyllabusParseResult {
  courseName: string | null
  instructor: string | null
  exams: ParsedExam[]
  topics: ParsedTopic[]
  assignmentDates: Array<{ name: string; date: string }>
  rawExtraction: string
}

interface SyllabusUploaderProps {
  onParsed: (result: SyllabusParseResult, documentId?: string) => void
  onCancel?: () => void
  className?: string
}

export default function SyllabusUploader({
  onParsed,
  onCancel,
  className = ''
}: SyllabusUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<SyllabusParseResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    setError(null)

    // Check file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Check file size (max 10MB for syllabus)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const handleUploadAndParse = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      // First, upload the document
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', 'syllabus')

      // Get upload URL
      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          documentType: 'syllabus'
        })
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, documentId } = await uploadResponse.json()

      // Upload file directly to storage
      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file')
      }

      // Complete the upload and extract text
      const completeResponse = await fetch(`/api/documents/${documentId}/complete`, {
        method: 'POST'
      })

      if (!completeResponse.ok) {
        throw new Error('Failed to process document')
      }

      const { extractedText } = await completeResponse.json()

      setIsUploading(false)
      setIsParsing(true)

      // Parse the syllabus
      const parseResponse = await fetch('/api/syllabus/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          text: extractedText
        })
      })

      if (!parseResponse.ok) {
        throw new Error('Failed to parse syllabus')
      }

      const result: SyllabusParseResult = await parseResponse.json()
      setParseResult(result)
      setIsParsing(false)

      // Callback with parsed result
      onParsed(result, documentId)
    } catch (err) {
      console.error('Error uploading/parsing syllabus:', err)
      setError(err instanceof Error ? err.message : 'Failed to process syllabus')
      setIsUploading(false)
      setIsParsing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParseResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute -top-2 -right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700
            rounded-full border border-slate-700/50 text-slate-400 hover:text-white
            transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {!file && !parseResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative p-8 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-300 group
            ${isDragging
              ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
              : 'border-slate-700/50 hover:border-purple-500/50 bg-slate-900/30 hover:bg-slate-900/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center text-center">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-4
              transition-all duration-300
              ${isDragging
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-slate-800/50 text-slate-400 group-hover:text-purple-400 group-hover:bg-purple-500/10'
              }
            `}>
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Upload Your Syllabus
            </h3>
            <p className="text-sm text-slate-400 mb-4 max-w-xs">
              Drop your syllabus here or click to browse. We&apos;ll extract exam dates, topics, and create your study plan.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileText className="w-4 h-4" />
              <span>PDF, DOCX, or TXT (max 10MB)</span>
            </div>
          </div>

          {/* Animated border */}
          {isDragging && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {file && !parseResult && (
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate">{file.name}</h4>
              <p className="text-sm text-slate-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>

              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleUploadAndParse}
                  disabled={isUploading || isParsing}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600
                    hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium
                    rounded-lg transition-all duration-200 disabled:opacity-50
                    disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Process Syllabus
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  disabled={isUploading || isParsing}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white
                    transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          {(isUploading || isParsing) && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isUploading || isParsing ? 'bg-purple-500/20' : 'bg-green-500/20'
                }`}>
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <span className="text-sm text-slate-300">Upload to storage</span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isParsing ? 'bg-purple-500/20' : isUploading ? 'bg-slate-800' : 'bg-green-500/20'
                }`}>
                  {isParsing ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  ) : isUploading ? (
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <span className={`text-sm ${isParsing ? 'text-slate-300' : 'text-slate-500'}`}>
                  AI extraction of dates, topics & schedule
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {parseResult && (
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-green-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Syllabus Parsed Successfully</h4>
              <p className="text-sm text-slate-400">Ready to create your study plan</p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {parseResult.courseName && (
              <div className="flex items-center gap-3 text-sm">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300">{parseResult.courseName}</span>
              </div>
            )}
            {parseResult.instructor && (
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">{parseResult.instructor}</span>
              </div>
            )}
            {parseResult.exams.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-pink-400" />
                <span className="text-slate-300">
                  {parseResult.exams.length} exam{parseResult.exams.length > 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white
                border border-slate-700/50 hover:border-slate-600 rounded-lg transition-colors"
            >
              Upload Different
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
