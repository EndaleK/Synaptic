"use client"

import { useState } from "react"
import { Plus, Upload, BookOpen, MessageSquare, X, Mic, Network, PenLine } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface QuickActionButtonProps {
  className?: string
}

export default function QuickActionButton({ className }: QuickActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const actions = [
    {
      icon: Upload,
      label: "Upload Document",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard/documents')
      }
    },
    {
      icon: BookOpen,
      label: "Create Flashcards",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard?mode=flashcards')
      }
    },
    {
      icon: MessageSquare,
      label: "Start Chat",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard?mode=chat')
      }
    },
    {
      icon: PenLine,
      label: "Write Essay",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard/writer')
      }
    },
    {
      icon: Mic,
      label: "Generate Podcast",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard?mode=podcast')
      }
    },
    {
      icon: Network,
      label: "Create Mind Map",
      color: "from-accent-primary to-accent-secondary",
      action: () => {
        setIsOpen(false)
        router.push('/dashboard?mode=mindmap')
      }
    }
  ]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Menu */}
      <div className={cn("fixed bottom-52 right-6 z-50 flex flex-col-reverse gap-3", className)}>
        {isOpen && (
          <>
            {actions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all animate-in slide-in-from-bottom",
                    "group"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animationDuration: "200ms"
                  }}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r",
                    action.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-40 right-6 z-50 w-14 h-14 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group",
          className
        )}
        aria-label="Quick actions"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white transition-transform group-hover:rotate-90" />
        ) : (
          <Plus className="w-6 h-6 text-white transition-transform group-hover:rotate-90" />
        )}
      </button>
    </>
  )
}
