'use client'

import { useState, useEffect } from 'react'
import { useStudyGoalsStore, type DailyGoals } from '@/lib/store/useStudyGoalsStore'
import { X, Target, Save, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GoalsSettingsModal() {
  const {
    dailyGoals,
    isGoalsModalOpen,
    setGoalsModalOpen,
    setDailyGoals
  } = useStudyGoalsStore()

  const [localGoals, setLocalGoals] = useState<DailyGoals>(dailyGoals)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setLocalGoals(dailyGoals)
    setHasChanges(false)
  }, [dailyGoals, isGoalsModalOpen])

  const handleChange = (key: keyof DailyGoals, value: string) => {
    const numValue = parseInt(value) || 0
    setLocalGoals(prev => ({ ...prev, [key]: numValue }))
    setHasChanges(true)
  }

  const handleSave = () => {
    setDailyGoals(localGoals)
    setHasChanges(false)
    setGoalsModalOpen(false)
  }

  const handleReset = () => {
    const defaultGoals: DailyGoals = {
      studyMinutes: 60,
      flashcardsReviewed: 20,
      documentsRead: 1,
      pomodoroSessions: 2
    }
    setLocalGoals(defaultGoals)
    setHasChanges(true)
  }

  if (!isGoalsModalOpen) return null

  const goalFields = [
    {
      key: 'studyMinutes' as keyof DailyGoals,
      label: 'Study Time',
      icon: 'ð',
      unit: 'minutes',
      description: 'Daily study time goal',
      min: 15,
      max: 480,
      step: 15
    },
    {
      key: 'flashcardsReviewed' as keyof DailyGoals,
      label: 'Flashcards',
      icon: '¡',
      unit: 'cards',
      description: 'Flashcards to review per day',
      min: 5,
      max: 200,
      step: 5
    },
    {
      key: 'documentsRead' as keyof DailyGoals,
      label: 'Documents',
      icon: '=Ú',
      unit: 'documents',
      description: 'Documents to interact with',
      min: 1,
      max: 10,
      step: 1
    },
    {
      key: 'pomodoroSessions' as keyof DailyGoals,
      label: 'Pomodoro Sessions',
      icon: '<E',
      unit: 'sessions',
      description: 'Focus sessions to complete',
      min: 1,
      max: 12,
      step: 1
    }
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={() => setGoalsModalOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Daily Goals</h2>
                  <p className="text-sm text-white/80">Customize your daily learning targets</p>
                </div>
              </div>
              <button
                onClick={() => setGoalsModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {goalFields.map((field) => (
              <div key={field.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{field.icon}</span>
                    <div>
                      <label className="text-sm font-semibold text-gray-900 dark:text-white">
                        {field.label}
                      </label>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {field.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={localGoals[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className="w-20 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px]">
                      {field.unit}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="pl-11">
                  <input
                    type="range"
                    value={localGoals[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
                    <span>{field.min}</span>
                    <span>{field.max}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                =¡ <span className="font-semibold">Tip:</span> Set realistic goals that challenge you without causing burnout. You can adjust these anytime!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setGoalsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                  hasChanges
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:scale-105"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                Save Goals
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
