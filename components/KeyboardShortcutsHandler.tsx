"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface KeyboardShortcutsHandlerProps {
  onNewFolder?: () => void
  onUpload?: () => void
  onToggleSidebar?: () => void
  onToggleView?: (view: 'grid' | 'list' | 'table') => void
  onQuickSearch?: () => void
}

export default function KeyboardShortcutsHandler({
  onNewFolder,
  onUpload,
  onToggleSidebar,
  onToggleView,
  onQuickSearch
}: KeyboardShortcutsHandlerProps) {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + K: Quick search
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onQuickSearch?.()
      }

      // Cmd/Ctrl + N: New folder
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onNewFolder?.()
      }

      // Cmd/Ctrl + U: Upload document
      if (modifier && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        onUpload?.()
      }

      // Cmd/Ctrl + B: Toggle sidebar
      if (modifier && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        onToggleSidebar?.()
      }

      // Cmd/Ctrl + 1/2/3: Switch views (List, Table, Grid)
      if (modifier && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const views = ['list', 'table', 'grid'] as const
        onToggleView?.(views[parseInt(e.key) - 1])
      }

      // Escape: Clear search/selection
      if (e.key === 'Escape') {
        // Let components handle their own escape logic
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewFolder, onUpload, onToggleSidebar, onToggleView, onQuickSearch, router])

  return null
}
