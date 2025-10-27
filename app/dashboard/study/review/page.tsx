"use client"

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReviewQueue from '@/components/StudyScheduler/ReviewQueue'
import BreakReminder from '@/components/StudyScheduler/BreakReminder'

export default function ReviewQueuePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Flashcard Review
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review flashcards using spaced repetition for optimal retention
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ReviewQueue
          onComplete={() => {
            // Optional: redirect or show completion message
            console.log('Review session completed!')
          }}
        />
      </div>

      {/* Break Reminder Overlay */}
      <BreakReminder enabled={true} />
    </div>
  )
}
