"use client"

import { TrendingUp, FileText, File, X, Lightbulb, Sparkles, Check, BookOpen, FileCheck } from "lucide-react"

interface WritingSidePanelProps {
  wordCount: number
  characterCount: number
  goalWordCount?: number
  uploadedFiles?: Array<{ id: string; name: string; size: number; type: string }>
  onRemoveFile?: (fileId: string) => void
  onGenerateOutline?: () => void
  onImproveTone?: () => void
  onCheckPlagiarism?: () => void
  onAddCitations?: () => void
}

export default function WritingSidePanel({
  wordCount = 0,
  characterCount = 0,
  goalWordCount = 2000,
  uploadedFiles = [],
  onRemoveFile,
  onGenerateOutline,
  onImproveTone,
  onCheckPlagiarism,
  onAddCitations
}: WritingSidePanelProps) {
  const progressPercentage = Math.min((wordCount / goalWordCount) * 100, 100)

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📕'
    if (type.includes('image')) return '🖼️'
    if (type.includes('word') || type.includes('document')) return '📘'
    return '📄'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <aside className="w-80 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-5 overflow-y-auto flex flex-col gap-4">
      {/* Progress Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Progress</h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xl font-bold text-purple-600">{wordCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Words</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xl font-bold text-purple-600">{characterCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Characters</div>
          </div>
        </div>

        {/* Goal Progress */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
            <span>Goal: {goalWordCount.toLocaleString()} words</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-violet-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Uploaded Files Card */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <File className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Uploaded Files</h3>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{getFileIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">AI Assistant</h3>
        </div>

        <div className="space-y-2">
          {onGenerateOutline && (
            <button
              onClick={onGenerateOutline}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                <span>Generate Outline</span>
              </div>
            </button>
          )}

          {onImproveTone && (
            <button
              onClick={onImproveTone}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Improve Tone</span>
              </div>
            </button>
          )}

          {onCheckPlagiarism && (
            <button
              onClick={onCheckPlagiarism}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Plagiarism Check</span>
              </div>
            </button>
          )}

          {onAddCitations && (
            <button
              onClick={onAddCitations}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Add Citations</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Writing Tips Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-purple-600" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Writing Tips</h3>
        </div>

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            <strong className="text-gray-900 dark:text-white">🎯 Focus:</strong> Keep your thesis clear and concise.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">📌 Evidence:</strong> Support each point with citations.
          </p>
        </div>
      </div>
    </aside>
  )
}
