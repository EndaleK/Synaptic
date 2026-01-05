"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Clock, FileText, Link as LinkIcon, Youtube, Loader2, AlertCircle, Upload, Sparkles, Download, Zap, CheckCircle, X, ListChecks, Save, FileDown, Settings2 } from "lucide-react"
import { ELEVENLABS_VOICES, DEFAULT_VOICE_HOST_A, DEFAULT_VOICE_HOST_B } from "@/lib/tts-generator"
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
  keyTakeaways?: string[]
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

  // Save to library state
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)

  // Voice selection state
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [voiceHostA, setVoiceHostA] = useState<string>(DEFAULT_VOICE_HOST_A)
  const [voiceHostB, setVoiceHostB] = useState<string>(DEFAULT_VOICE_HOST_B)

  // Handle file selection
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
    // Also check for .md files that browsers may report as text/plain
    const isMdFile = file.name.toLowerCase().endsWith('.md')
    if (!allowedTypes.includes(file.type) && !isMdFile) {
      setUploadError('Please upload a PDF, DOCX, TXT, or MD file')
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
        language: 'en-us',
        voiceHostA,
        voiceHostB
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

  // Generate formatted text summary
  const generateTextSummary = () => {
    if (!summary) return ''

    let text = `# ${summary.title}\n\n`
    text += `${summary.description}\n\n`
    text += `---\n\n`
    text += `**Source:** ${summary.inputType === 'document' ? 'Document' : summary.inputType === 'url' ? 'Web Page' : 'YouTube Video'}\n`
    text += `**Duration:** ${Math.ceil(summary.duration / 60)} minutes\n`
    text += `**Generated:** ${new Date().toLocaleDateString()}\n\n`
    text += `---\n\n`

    if (summary.keyTakeaways && summary.keyTakeaways.length > 0) {
      text += `## Key Takeaways\n\n`
      summary.keyTakeaways.forEach((takeaway, index) => {
        text += `${index + 1}. ${takeaway}\n\n`
      })
    }

    return text
  }

  // Handle download text summary
  const handleDownloadTextSummary = () => {
    if (!summary) return

    const textContent = generateTextSummary()
    const blob = new Blob([textContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${summary.title || 'quick-summary'}-takeaways.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    toast.success('Summary downloaded as markdown file')
  }

  // Handle save to library
  const handleSaveToLibrary = async () => {
    if (!summary) return

    setIsSavingToLibrary(true)

    try {
      const textContent = generateTextSummary()
      const fileName = `${summary.title || 'Quick Summary'} - Takeaways.txt`

      // Create a text file and upload it as a document
      const blob = new Blob([textContent], { type: 'text/plain' })
      const file = new File([blob], fileName, { type: 'text/plain' })

      // Step 1: Get signed upload URL
      const uploadUrlResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName,
          fileSize: file.size,
          fileType: 'text/plain'
        })
      })

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { uploadUrl, documentId: newDocId, storagePath } = await uploadUrlResponse.json()

      // Step 2: Upload the text file
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'x-upsert': 'true'
        },
        body: file
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload summary to storage')
      }

      // Step 3: Complete the upload
      const completeResponse = await fetch(`/api/documents/${newDocId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storagePath })
      })

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to complete upload')
      }

      toast.success('Summary saved to your library!')
    } catch (err: any) {
      console.error('Save to library error:', err)
      toast.error(err.message || 'Failed to save to library')
    } finally {
      setIsSavingToLibrary(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-cyan-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-cyan-950/30 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-b border-cyan-200 dark:border-cyan-500/20 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Quick Summary</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">Get the gist in 5 minutes - fast, focused, and energetic</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Input Type Selector */}
          {!summary && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-cyan-200 dark:border-gray-700 shadow-lg shadow-cyan-100/50 dark:shadow-none p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-500" />
                Choose Your Source
              </h2>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setInputType('document')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    inputType === 'document'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">{selectedDocumentName}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">Ready for summary</p>
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
                          className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : isUploading ? (
                    <div className="p-6 bg-cyan-50 dark:bg-zinc-800/50 rounded-lg border border-cyan-200 dark:border-zinc-700">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                        <p className="text-gray-900 dark:text-white font-medium">Uploading document...</p>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">{uploadProgress}% complete</p>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="document-upload-input"
                      />
                      <label
                        htmlFor="document-upload-input"
                        className="flex flex-col items-center justify-center w-full p-8 bg-cyan-50/50 dark:bg-zinc-800/30 border-2 border-dashed border-cyan-300 dark:border-zinc-700 rounded-lg cursor-pointer hover:bg-cyan-100/50 dark:hover:bg-zinc-800/50 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all"
                      >
                        <Upload className="w-12 h-12 text-cyan-400 mb-3" />
                        <p className="text-gray-900 dark:text-white font-medium mb-1">Click to upload document</p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">PDF, DOCX, TXT, or MD (max 10MB)</p>
                      </label>
                      {uploadError && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600 dark:text-red-200">{uploadError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* URL Input */}
              {inputType === 'url' && (
                <div className="space-y-2">
                  <label htmlFor="url-input" className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                    Article or Web Page URL
                  </label>
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article (not PDF links)"
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    aria-label="Enter web page URL"
                  />
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 rounded-lg">
                    <p className="text-xs text-cyan-700 dark:text-cyan-200 mb-2">
                      <strong>⚠️ Known Limitation:</strong> URL extraction has compatibility issues
                    </p>
                    <ul className="text-xs text-cyan-600 dark:text-cyan-200 space-y-1 ml-4">
                      <li>• <strong>For PDFs (including arXiv):</strong> Download and use Document tab</li>
                      <li>• <strong>For articles:</strong> May work, but Document tab is more reliable</li>
                      <li>• <strong>Alternative:</strong> Copy text and paste into a .txt file</li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">
                    📝 <strong>Recommendation:</strong> Use Document or YouTube tabs for best results
                  </p>
                </div>
              )}

              {/* YouTube Input */}
              {inputType === 'youtube' && (
                <div className="space-y-2">
                  <label htmlFor="youtube-input" className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                    YouTube Video URL
                  </label>
                  <input
                    id="youtube-input"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    aria-label="Enter YouTube video URL"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-zinc-500">
                      ✓ Best for videos under 30 minutes
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500">
                      ✓ Both youtube.com/watch?v= and youtu.be/ formats supported
                    </p>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400">
                      ⚠️ Video must have captions/subtitles enabled
                    </p>
                  </div>
                </div>
              )}

              {/* Advanced Options */}
              <div className="mt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  {showAdvanced ? '− Hide' : '+'} Voice Settings
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 bg-cyan-50/50 dark:bg-zinc-800/50 rounded-lg border border-cyan-200 dark:border-zinc-700">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      🎙️ Voice Selection
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Host A Voice */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
                          Host A (Main Speaker)
                        </label>
                        <select
                          value={voiceHostA}
                          onChange={(e) => setVoiceHostA(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                        >
                          {ELEVENLABS_VOICES.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description} ({voice.gender})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Host B Voice */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1.5">
                          Host B (Co-host)
                        </label>
                        <select
                          value={voiceHostB}
                          onChange={(e) => setVoiceHostB(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                        >
                          {ELEVENLABS_VOICES.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} - {voice.description} ({voice.gender})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2">
                      Powered by ElevenLabs for natural-sounding voices
                    </p>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
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
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-cyan-200 dark:border-gray-700 shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Creating Your Summary</h3>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-zinc-400">{progressMessage}</p>
              <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-700 dark:text-cyan-200">
                  ⚡ This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-600 dark:text-red-400 font-semibold mb-1">Generation Failed</h3>
                <p className="text-red-600 dark:text-red-200 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 text-xs text-red-500 dark:text-red-300 hover:text-red-700 dark:hover:text-red-100 underline"
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-cyan-200 dark:border-gray-700 shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{summary.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">{summary.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 dark:text-zinc-500">
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
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-lg transition-colors text-sm"
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

              {/* Key Takeaways */}
              {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-cyan-200 dark:border-gray-700 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-cyan-500" />
                      Key Takeaways
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadTextSummary}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-200 rounded-lg transition-colors"
                        title="Download as text file"
                      >
                        <FileDown className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={handleSaveToLibrary}
                        disabled={isSavingToLibrary}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save to your document library"
                      >
                        {isSavingToLibrary ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save to Library
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {summary.keyTakeaways.map((takeaway, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generate Another Button */}
              <button
                onClick={() => {
                  setSummary(null)
                  setError(null)
                  setProgress(0)
                }}
                className="w-full px-6 py-3 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Generate Another Summary
              </button>
            </div>
          )}

          {/* Feature Info */}
          {!summary && !isGenerating && (
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-200 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-cyan-800 dark:text-cyan-100">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span><strong>5 minutes</strong> of energetic, focused content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span><strong>AI-powered</strong> extraction of key concepts and takeaways</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span><strong>Conversational format</strong> with two hosts discussing the content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 mt-1">•</span>
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
