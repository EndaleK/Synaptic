"use client"

import { ArrowLeft, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PomodoroTimer from '@/components/StudyScheduler/PomodoroTimer'
import BreakReminder from '@/components/StudyScheduler/BreakReminder'
import { useDocumentStore } from '@/lib/store/useStore'

export default function PomodoroPage() {
  const router = useRouter()
  const { currentDocument } = useDocumentStore()

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
                Pomodoro Timer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay focused with the Pomodoro Technique: 25 minutes of work, 5 minutes of rest
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PomodoroTimer
          documentId={currentDocument?.id}
          onSessionComplete={(duration) => {
            console.log(`Session completed: ${duration} minutes`)
          }}
        />

        {/* Persistent Timer Card */}
        <div className="mt-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Persistent Timer Widget
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                A floating timer widget will appear in the bottom-right corner when you start a Pomodoro session.
                It stays visible across all pages, so you can navigate freely while your timer runs!
              </p>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                  <span>Start a timer above and it will appear as a floating widget</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                  <span>Click the widget to expand and see full controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                  <span>The widget persists even when you switch pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                  <span>Click the maximize button to return to this full timer page</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Pomodoro Technique Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">1.</span>
              <span><strong>Work for 25 minutes</strong> - Focus on a single task without distractions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">2.</span>
              <span><strong>Take a 5-minute break</strong> - Stand up, stretch, and rest your eyes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">3.</span>
              <span><strong>Repeat 4 times</strong> - After 4 pomodoros, take a longer 15-minute break</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">4.</span>
              <span><strong>Track your progress</strong> - See your completed sessions grow over time</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Break Reminder Overlay */}
      <BreakReminder enabled={true} />
    </div>
  )
}
