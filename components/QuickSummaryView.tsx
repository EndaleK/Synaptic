"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Clock, FileText, Link as LinkIcon, Youtube, Loader2, AlertCircle, Upload, Sparkles, Download, Zap, CheckCircle, X } from "lucide-react"
import PodcastPlayer, { type TranscriptEntry } from "./PodcastPlayer"
import { useToast } from "./ToastContainer"

interface QuickSummaryViewProps {
  // Optional: Pre-selected document
  documentId?: string
  documentName?: string
}

interface SummaryData {
  id: string
  title: string
  description: string
  audioUrl: string
  duration: number
  fileSize: number
  transcript: TranscriptEntry[]
  inputType: 'document' | 'url' | 'youtube'
  source: string
}

export default function QuickSummaryView({ documentId, documentName }: QuickSummaryViewProps) {
  const toast = useToast()

  // State management
  const [inputType, setInputType] = useState<'document' | 'url' | 'youtube'>('document')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(documentId)
  const [selectedDocumentName, setSelectedDocumentName] = useState<string | undefined>(documentName)
  const [url, setUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Document upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Validate file size (10MB for quick summary)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setUploadError('File is too large. Maximum size is 10MB for quick summaries.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      // Step 1: Get signed upload URL
      const uploadUrlResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
      })

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { uploadUrl, documentId: newDocId, storagePath } = await uploadUrlResponse.json()

      // Step 2: Upload file directly to storage
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', async () => {
        // Supabase signed URL uploads can return 200, 201, or 204
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Step 3: Notify server that upload is complete
            const completeResponse = await fetch(`/api/documents/${newDocId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: storagePath })
            })

            if (completeResponse.ok) {
              const completeData = await completeResponse.json()
              setSelectedDocumentId(newDocId)
              setSelectedDocumentName(file.name)
              setIsUploading(false)
              setUploadProgress(100)
              toast.success(`Document uploaded: ${file.name}`)
            } else {
              const errorData = await completeResponse.json().catch(() => ({}))
              throw new Error(errorData.error || 'Failed to complete upload')
            }
          } catch (completeError: any) {
            console.error('Complete upload error:', completeError)
            setUploadError(completeError.message || 'Failed to finalize upload')
            toast.error(completeError.message || 'Failed to finalize upload')
            setIsUploading(false)
          }
        } else {
          const errorMsg = `Upload failed with status ${xhr.status}: ${xhr.statusText}`
          console.error('Upload error:', errorMsg, xhr.responseText)
          setUploadError(errorMsg)
          toast.error(errorMsg)
          setIsUploading(false)
        }
      })

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed')
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.send(file)

    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload document')
      toast.error(err.message || 'Failed to upload document')
      setIsUploading(false)
    }
  }

  // Handle generate summary
  const handleGenerate = async () => {
    // Validation
    if (inputType === 'document' && !selectedDocumentId) {
      toast.error('Please upload a document first')
      return
    }

    if (inputType === 'url' && !url.trim()) {
      toast.error('Please enter a URL')
      return
    }

    if (inputType === 'youtube') {
      if (!youtubeUrl.trim()) {
        toast.error('Please enter a YouTube URL')
        return
      }

      // Validate YouTube URL format
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      if (!youtubeRegex.test(youtubeUrl)) {
        toast.error('Invalid YouTube URL. Please use format: https://youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID')
        return
      }
    }

    // Reset state
    setIsGenerating(true)
    setProgress(0)
    setProgressMessage('Starting generation...')
    setError(null)
    setSummary(null)

    try {
      // Create request body
      const requestBody: any = {
        inputType,
        language: 'en-us'
      }

      if (inputType === 'document') {
        requestBody.documentId = selectedDocumentId
      } else if (inputType === 'url') {
        requestBody.url = url
      } else if (inputType === 'youtube') {
        requestBody.youtubeUrl = youtubeUrl
      }

      // Send POST request and handle SSE streaming
      const response = await fetch('/api/generate-quick-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start generation')
      }

      // Handle SSE streaming from response body
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setProgress(data.progress || 0)
                setProgressMessage(data.message || '')
              } else if (data.type === 'complete') {
                setSummary(data.data.summary)
                setProgress(100)
                setProgressMessage('Summary ready!')
                toast.success('5-minute summary generated successfully!')
                setIsGenerating(false)
              } else if (data.type === 'error') {
                setError(data.error || 'Failed to generate summary')
                toast.error(data.error || 'Failed to generate summary')
                setIsGenerating(false)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }

    } catch (err: any) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to generate summary')
      toast.error(err.message || 'Failed to generate summary')
      setIsGenerating(false)
    }
  }

  // Handle download audio
  const handleDownload = () => {
    if (!summary?.audioUrl) return

    const link = document.createElement('a')
    link.href = summary.audioUrl
    link.download = `${summary.title || 'quick-summary'}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-amber-500/20 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Quick Summary</h1>
            <p className="text-sm text-zinc-400">Get the gist in 5 minutes - fast, focused, and energetic</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Input Type Selector */}
          {!summary && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Choose Your Source
              </h2>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setInputType('document')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    inputType === 'document'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  aria-label="Select document input"
                >
                  <FileText className="w-4 h-4" />
                  Document
                </button>
                <button
                  onClick={() => setInputType('url')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    inputType === 'url'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  aria-label="Select URL input"
                >
                  <LinkIcon className="w-4 h-4" />
                  Web URL
                </button>
                <button
                  onClick={() => setInputType('youtube')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    inputType === 'youtube'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  aria-label="Select YouTube input"
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </button>
              </div>

              {/* Document Upload */}
              {inputType === 'document' && (
                <div className="space-y-4">
                  {selectedDocumentId ? (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white font-medium">{selectedDocumentName}</p>
                            <p className="text-xs text-zinc-500">Ready for summary</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDocumentId(undefined)
                            setSelectedDocumentName(undefined)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : isUploading ? (
                    <div className="p-6 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <p className="text-white font-medium">Uploading document...</p>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-zinc-400 mt-2">{uploadProgress}% complete</p>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="document-upload-input"
                      />
                      <label
                        htmlFor="document-upload-input"
                        className="flex flex-col items-center justify-center w-full p-8 bg-zinc-800/30 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800/50 hover:border-amber-500/50 transition-all"
                      >
                        <Upload className="w-12 h-12 text-zinc-500 mb-3" />
                        <p className="text-white font-medium mb-1">Click to upload document</p>
                        <p className="text-sm text-zinc-400">PDF, DOCX, or TXT (max 10MB)</p>
                      </label>
                      {uploadError && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-200">{uploadError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              {inputType === 'url' && (
                <div className="space-y-2">
                  <label htmlFor="url-input" className="text-sm font-medium text-zinc-400">
                    Article or Web Page URL
                  </label>
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article (not PDF links)"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    aria-label="Enter web page URL"
                  />
                  <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-200 mb-2">
                      <strong>⚠️ Known Limitation:</strong> URL extraction has compatibility issues
                    </p>
                    <ul className="text-xs text-amber-200 space-y-1 ml-4">
                      <li>• <strong>For PDFs (including arXiv):</strong> Download and use Document tab</li>
                      <li>• <strong>For articles:</strong> May work, but Document tab is more reliable</li>
                      <li>• <strong>Alternative:</strong> Copy text and paste into a .txt file</li>
                    </ul>
                  </div>
                  <p className="text-xs text-zinc-500">
                    📝 <strong>Recommendation:</strong> Use Document or YouTube tabs for best results
                  </p>
                </div>
              )}

              {/* YouTube Input */}
              {inputType === 'youtube' && (
                <div className="space-y-2">
                  <label htmlFor="youtube-input" className="text-sm font-medium text-zinc-400">
                    YouTube Video URL
                  </label>
                  <input
                    id="youtube-input"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    aria-label="Enter YouTube video URL"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">
                      ✓ Best for videos under 30 minutes
                    </p>
                    <p className="text-xs text-zinc-500">
                      ✓ Both youtube.com/watch?v= and youtu.be/ formats supported
                    </p>
                    <p className="text-xs text-amber-400">
                      ⚠️ Video must have captions/subtitles enabled
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                aria-label="Generate 5-minute summary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate 5-Minute Summary
                  </>
                )}
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                <h3 className="text-lg font-semibold text-white">Creating Your Summary</h3>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-sm text-zinc-400">{progressMessage}</p>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-200">
                  ⚡ This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-1">Generation Failed</h3>
                <p className="text-red-200 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-xs text-red-300 hover:text-red-100 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Summary Result */}
          {summary && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2">{summary.title}</h2>
                    <p className="text-sm text-zinc-400">{summary.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.ceil(summary.duration / 60)} min
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {summary.inputType === 'document' ? 'Document' : summary.inputType === 'url' ? 'Web Page' : 'YouTube'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
                    aria-label="Download audio file"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                {/* Audio Player */}
                <PodcastPlayer
                  audioUrl={summary.audioUrl}
                  transcript={summary.transcript}
                  title={summary.title}
                />
              </div>

              {/* Generate Another Button */}
              <button
                onClick={() => {
                  setSummary(null)
                  setError(null)
                  setProgress(0)
                }}
                className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Another Summary
              </button>
            </div>
          )}

          {/* Feature Info */}
          {!summary && !isGenerating && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-amber-200 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-amber-100">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>5 minutes</strong> of energetic, focused content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>AI-powered</strong> extraction of key concepts and takeaways</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Conversational format</strong> with two hosts discussing the content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span><strong>Perfect for</strong> quick reviews, commutes, or time-crunched studying</span>
                </li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
