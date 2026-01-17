'use client'

import { useState, useEffect } from 'react'
import {
  X,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
} from 'lucide-react'

interface Document {
  id: string
  file_name: string
  file_type: string
  created_at: string
}

interface StudyGuideGeneratorProps {
  planId: string | null
  onClose: () => void
  onComplete: () => void
}

export default function StudyGuideGenerator({
  planId,
  onClose,
  onComplete,
}: StudyGuideGeneratorProps) {
  const [step, setStep] = useState<'select-doc' | 'configure' | 'generating' | 'complete'>('select-doc')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generation options
  const [targetDays, setTargetDays] = useState(7)
  const [dailyMinutes, setDailyMinutes] = useState(60)
  const [includeFlashcards, setIncludeFlashcards] = useState(true)
  const [includePodcasts, setIncludePodcasts] = useState(true)
  const [includeMindmaps, setIncludeMindmaps] = useState(true)
  const [includeQuizzes, setIncludeQuizzes] = useState(true)

  // Progress tracking
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')

  // Fetch user's documents
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/documents')
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Error fetching documents:', err)
        setError('Failed to load documents')
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  const handleGenerate = async () => {
    if (!selectedDocId || !planId) return

    setStep('generating')
    setProgress(0)
    setCurrentStep('Analyzing document...')
    setError(null)

    try {
      // Start the generation
      const response = await fetch('/api/study-guide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocId,
          studyPlanId: planId,
          targetDays,
          dailyMinutes,
          options: {
            includeFlashcards,
            includePodcasts,
            includeMindmaps,
            includeQuizzes,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate study guide')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'progress') {
                  setProgress(data.progress)
                  setCurrentStep(data.message)
                } else if (data.type === 'complete') {
                  setProgress(100)
                  setCurrentStep('Complete!')
                  setStep('complete')

                  // Sync to schedule if needed
                  if (data.studyGuideId) {
                    await fetch('/api/study-guide/sync-schedule', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        studyGuideId: data.studyGuideId,
                        studyPlanId: planId,
                      }),
                    })
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (e) {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate study guide')
      setStep('configure')
    }
  }

  const selectedDoc = documents.find(d => d.id === selectedDocId)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Generate Study Guide</h2>
              <p className="text-white/50 text-sm">AI-powered daily content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Document */}
          {step === 'select-doc' && (
            <div>
              <h3 className="text-white font-medium mb-4">Select a document</h3>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No documents found</p>
                  <p className="text-white/30 text-sm">Upload a document first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedDocId === doc.id
                          ? 'bg-purple-500/20 border-purple-500/50'
                          : 'bg-white/5 border-transparent hover:bg-white/10'
                      } border`}
                    >
                      <FileText className={`w-5 h-5 ${
                        selectedDocId === doc.id ? 'text-purple-400' : 'text-white/40'
                      }`} />
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm font-medium truncate">{doc.file_name}</p>
                        <p className="text-white/40 text-xs">
                          {doc.file_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedDocId === doc.id && (
                        <CheckCircle2 className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep('configure')}
                disabled={!selectedDocId}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <div>
              <div className="mb-4 p-3 bg-white/5 rounded-xl flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedDoc?.file_name}</p>
                </div>
                <button
                  onClick={() => setStep('select-doc')}
                  className="text-purple-400 text-sm hover:text-purple-300"
                >
                  Change
                </button>
              </div>

              <h3 className="text-white font-medium mb-4">Configure your study guide</h3>

              <div className="space-y-4">
                {/* Duration */}
                <div>
                  <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Study Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 14, 21, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => setTargetDays(days)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          targetDays === days
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Time */}
                <div>
                  <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Daily Study Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setDailyMinutes(mins)}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          dailyMinutes === mins
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Types */}
                <div>
                  <label className="text-white/70 text-sm mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Content Types
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'flashcards', label: 'Flashcards', value: includeFlashcards, set: setIncludeFlashcards },
                      { id: 'podcasts', label: 'Podcasts', value: includePodcasts, set: setIncludePodcasts },
                      { id: 'mindmaps', label: 'Mind Maps', value: includeMindmaps, set: setIncludeMindmaps },
                      { id: 'quizzes', label: 'Daily Quizzes', value: includeQuizzes, set: setIncludeQuizzes },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => opt.set(!opt.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                          opt.value
                            ? 'bg-purple-500/20 border-purple-500/50'
                            : 'bg-white/5 border-transparent'
                        } border`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          opt.value ? 'border-purple-400 bg-purple-500' : 'border-white/30'
                        }`}>
                          {opt.value && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${opt.value ? 'text-white' : 'text-white/60'}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Generate Study Guide
              </button>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/10"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="url(#gen-gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 2.51} 251`}
                    className="transition-all duration-500"
                  />
                  <defs>
                    <linearGradient id="gen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{progress}%</span>
                </div>
              </div>

              <h3 className="text-white font-medium mb-2">Generating your study guide...</h3>
              <p className="text-white/50 text-sm">{currentStep}</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Study Guide Ready!</h3>
              <p className="text-white/50 mb-6">
                Your personalized study schedule has been created and synced to your planner.
              </p>

              <button
                onClick={() => {
                  onComplete()
                  onClose()
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-medium transition-all"
              >
                View Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
