"use client"

import { X, Upload, Compass, Sparkles, BookOpen, MessageSquare, Headphones, Target } from "lucide-react"

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
  onUploadClick?: () => void
}

export default function WelcomeModal({ isOpen, onClose, userName, onUploadClick }: WelcomeModalProps) {
  if (!isOpen) return null

  const displayName = userName?.split(' ')[0] || 'there'

  const handleUploadClick = () => {
    onClose()
    if (onUploadClick) {
      onUploadClick()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-fade-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-8 text-white">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to Synaptic, {displayName}!
            </h2>
            <p className="text-white/90 text-sm">
              You&apos;re all set to transform how you study
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload documents & generate flashcards</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PDFs, slides, even 800-page textbooks</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Chat with your notes using AI</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get answers from your actual documents</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Headphones className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Listen to audio summaries on the go</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Turn any document into a podcast</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Track your exam readiness</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Know exactly how prepared you are</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUploadClick}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Your First Document
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="w-5 h-5" />
              Explore Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
