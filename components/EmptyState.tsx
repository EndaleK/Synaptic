"use client"

import { LucideIcon, Upload, FileText, MessageSquare, BookOpen, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  variant?: 'default' | 'card'
}

export default function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default'
}: EmptyStateProps) {
  const containerClass = variant === 'card'
    ? "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12"
    : ""

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", containerClass, className)}>
      {/* Icon with gradient background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />
        <div className="relative w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center border-2 border-purple-200 dark:border-purple-800">
          <Icon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg",
                action.variant === 'secondary'
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:shadow-xl shadow-purple-500/30"
              )}
            >
              {action.label}
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states
export function NoDocumentsEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      icon={Upload}
      title="No documents yet"
      description="Upload your first document to start generating flashcards and chatting with your content. We support PDF, DOCX, TXT, and more."
      action={{
        label: "Upload Document",
        onClick: onUpload
      }}
      variant="card"
    />
  )
}

export function NoFlashcardsEmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No flashcards yet"
      description="Generate your first set of flashcards from a document. Our AI will automatically create study cards from your content."
      action={{
        label: "Generate Flashcards",
        onClick: onGenerate
      }}
      variant="card"
    />
  )
}

export function NoChatHistoryEmptyState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No chat history"
      description="Start a conversation with your document. Ask questions and get instant answers powered by AI."
      action={{
        label: "Start Chatting",
        onClick: onStartChat
      }}
      variant="card"
    />
  )
}

export function NoSearchResultsEmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms or filters.`}
      action={{
        label: "Clear Search",
        onClick: onClear,
        variant: 'secondary'
      }}
      variant="default"
      className="py-12"
    />
  )
}

export function LearningJourneyEmptyState({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <EmptyState
      icon={Sparkles}
      title="Start your learning journey"
      description="Welcome to your personal AI-powered study assistant. Upload documents, generate flashcards, and master any subject with intelligent learning tools."
      action={{
        label: "Get Started",
        onClick: onGetStarted
      }}
      secondaryAction={{
        label: "Learn More",
        onClick: () => window.open('/help', '_blank')
      }}
      variant="default"
      className="py-16"
    />
  )
}
