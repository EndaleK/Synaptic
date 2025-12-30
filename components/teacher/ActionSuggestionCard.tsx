'use client'

/**
 * ActionSuggestionCard Component
 * Displays a suggested action from the Agentic Teacher
 * User can approve or reject the action
 */

import { useState } from 'react'
import {
  Lightbulb,
  Check,
  X,
  Loader2,
  Headphones,
  GitBranch,
  ClipboardCheck,
  Zap,
  RotateCcw,
  Search,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { SuggestedAction, TeacherToolName } from '@/lib/teacher-agent/types'
import { getToolMetadata } from '@/lib/teacher-agent/tools'

// Icon mapping for tools
const toolIcons: Record<TeacherToolName, React.ElementType> = {
  generate_flashcards: Sparkles,
  generate_podcast: Headphones,
  generate_mindmap: GitBranch,
  generate_quiz: ClipboardCheck,
  generate_quick_summary: Zap,
  start_review_session: RotateCcw,
  search_documents: Search,
  explain_concept: Lightbulb,
  create_study_plan: Calendar,
  switch_mode: ArrowRight
}

interface ActionSuggestionCardProps {
  action: SuggestedAction
  onApprove: (actionId: string) => void
  onReject: (actionId: string) => void
  isExecuting?: boolean
}

export function ActionSuggestionCard({
  action,
  onApprove,
  onReject,
  isExecuting = false
}: ActionSuggestionCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const metadata = getToolMetadata(action.toolName)
  const Icon = toolIcons[action.toolName] || Lightbulb

  // Determine card state styling
  const isCompleted = action.status === 'completed'
  const isRejected = action.status === 'rejected'
  const isFailed = action.status === 'failed'
  const isPending = action.status === 'pending'

  // Card background based on status - works in both light and dark mode
  const cardBackground = isCompleted
    ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30'
    : isRejected
    ? 'bg-gray-100 dark:bg-gray-500/10 border-gray-300 dark:border-gray-500/30 opacity-60'
    : isFailed
    ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
    : isExecuting
    ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30'
    : 'bg-white dark:bg-gradient-to-r dark:from-purple-500/10 dark:to-pink-500/10 border-purple-200 dark:border-purple-500/20 hover:border-purple-400 dark:hover:border-purple-500/40 shadow-sm'

  // Icon background based on category - works in both light and dark mode
  const categoryColors: Record<string, string> = {
    generate: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    navigate: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    analyze: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
    plan: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
  }
  const iconBackground = categoryColors[metadata?.category || 'generate']

  return (
    <div
      className={`
        relative rounded-xl border p-4 transition-all duration-200
        ${cardBackground}
        ${isPending && !isExecuting ? 'cursor-default' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`rounded-lg p-2 ${iconBackground}`}>
          {isExecuting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isCompleted ? (
            <Check className="h-5 w-5 text-green-400" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              {metadata?.displayName || action.toolName.replace(/_/g, ' ')}
            </h4>
            {action.estimatedDuration && isPending && (
              <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800/50 px-2 py-0.5 rounded-full font-medium">
                {action.estimatedDuration}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {action.explanation}
          </p>

          {/* Status messages */}
          {isExecuting && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Working on it...
            </p>
          )}
          {isCompleted && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">Completed successfully</p>
          )}
          {isFailed && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">Something went wrong</p>
          )}
        </div>
      </div>

      {/* Action Buttons - Only show for pending actions */}
      {isPending && !isExecuting && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onApprove(action.id)}
            className="
              flex-1 flex items-center justify-center gap-2
              px-4 py-2 rounded-lg
              bg-gradient-to-r from-purple-600 to-pink-600
              hover:from-purple-500 hover:to-pink-500
              text-white text-sm font-medium
              transition-all duration-200
              shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30
            "
          >
            <Check className="h-4 w-4" />
            Let's do it
          </button>
          <button
            onClick={() => onReject(action.id)}
            className="
              px-4 py-2 rounded-lg
              bg-gray-200 dark:bg-gray-800/50 hover:bg-gray-300 dark:hover:bg-gray-700/50
              text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white
              text-sm font-medium
              transition-all duration-200
              border border-gray-300 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600/50
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subtle glow effect on hover */}
      {isPending && isHovered && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
    </div>
  )
}

/**
 * ActionSuggestionList Component
 * Displays a list of suggested actions
 */
interface ActionSuggestionListProps {
  actions: SuggestedAction[]
  onApprove: (actionId: string) => void
  onReject: (actionId: string) => void
  executingActionId: string | null
}

export function ActionSuggestionList({
  actions,
  onApprove,
  onReject,
  executingActionId
}: ActionSuggestionListProps) {
  // Filter to show only pending and executing actions
  const visibleActions = actions.filter(
    (a) => a.status === 'pending' || a.status === 'executing' || a.status === 'approved'
  )

  if (visibleActions.length === 0) return null

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Sparkles className="h-3 w-3" />
        <span>Suggested actions</span>
      </div>
      {visibleActions.map((action) => (
        <ActionSuggestionCard
          key={action.id}
          action={action}
          onApprove={onApprove}
          onReject={onReject}
          isExecuting={executingActionId === action.id}
        />
      ))}
    </div>
  )
}

export default ActionSuggestionCard
