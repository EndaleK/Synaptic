"use client"

import { X } from 'lucide-react'
import EssayUploader from './EssayUploader'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (essayId: string, title: string, content: string) => void
  onUploadError?: (error: string) => void
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onUploadError
}: UploadModalProps) {
  if (!isOpen) return null

  const handleUploadSuccess = (essayId: string, title: string, content: string) => {
    onUploadSuccess(essayId, title, content)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Upload Essay
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Import your essay in PDF, DOCX, DOC, or TXT format
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <EssayUploader
              onUploadSuccess={handleUploadSuccess}
              onUploadError={onUploadError}
            />
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Formatting will be preserved from DOCX files</span>
              </div>
              <span className="text-xs">Max 10MB</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
