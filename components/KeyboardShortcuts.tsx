"use client"

import { useEffect, useState } from "react"
import { X, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

export interface KeyboardShortcut {
  key: string
  description: string
  category: string
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: "Cmd+/", description: "Show keyboard shortcuts", category: "Navigation" },
  { key: "Esc", description: "Close modal or menu", category: "Navigation" },

  // Flashcards
  { key: "Space", description: "Flip flashcard", category: "Flashcards" },
  { key: "Enter", description: "Flip flashcard", category: "Flashcards" },
  { key: "→", description: "Next flashcard", category: "Flashcards" },
  { key: "←", description: "Previous flashcard", category: "Flashcards" },
  { key: "1-4", description: "Rate flashcard difficulty", category: "Flashcards" },

  // Document Upload
  { key: "Ctrl/Cmd + U", description: "Focus upload input", category: "Upload" },
  { key: "Ctrl/Cmd + V", description: "Paste to upload", category: "Upload" },

  // Chat
  { key: "Ctrl/Cmd + Enter", description: "Send message", category: "Chat" },
  { key: "↑", description: "Edit last message", category: "Chat" },
]

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Group shortcuts by category
  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4">
        <div className="m-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-white/90">Quick reference guide</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close shortcuts modal"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {categories.map((category) => {
              const categoryShortcuts = shortcuts.filter(s => s.category === category)

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <kbd className="px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm min-w-[60px] text-center">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Press <kbd className="px-2 py-1 text-xs font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Cmd+/</kbd> anytime to view this guide
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Hook to manage keyboard shortcuts modal globally
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts on "Cmd+/" or "Ctrl+/"
      if (e.key === "/" && (e.metaKey || e.ctrlKey) && !isOpen) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}
