"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Essay {
  id: string
  title: string
  word_count: number
  updated_at: string
}

interface DocumentSidebarProps {
  activeEssayId?: string
  onSelectEssay?: (essayId: string) => void
  onNewEssay?: () => void
  onSelectTemplate?: (template: string) => void
}

const TEMPLATES = [
  { id: "5-paragraph", name: "5-Paragraph Essay", icon: "📄" },
  { id: "research", name: "Research Paper", icon: "📊" },
  { id: "book-review", name: "Book Review", icon: "📖" },
  { id: "argumentative", name: "Argumentative", icon: "💡" }
]

export default function DocumentSidebar({
  activeEssayId,
  onSelectEssay,
  onNewEssay,
  onSelectTemplate
}: DocumentSidebarProps) {
  const [recentEssays, setRecentEssays] = useState<Essay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecentEssays()
  }, [])

  const fetchRecentEssays = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/essays?limit=5&sort=updated_at")

      if (!response.ok) {
        // API endpoint doesn't exist or returned error - that's okay, just show empty list
        console.log("Essays API not available, showing empty list")
        setRecentEssays([])
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        // Response is not JSON (probably 404 HTML page)
        console.log("Essays API returned non-JSON response, showing empty list")
        setRecentEssays([])
        return
      }

      const data = await response.json()
      setRecentEssays(data.essays || [])
    } catch (error) {
      console.error("Failed to fetch recent essays:", error)
      setRecentEssays([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false })
    } catch {
      return "Recently"
    }
  }

  return (
    <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
      {/* New Essay Button */}
      <div className="p-4">
        <button
          onClick={onNewEssay}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>New Essay</span>
        </button>
      </div>

      {/* Recent Documents */}
      <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Recent Documents
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg h-16" />
            ))}
          </div>
        ) : recentEssays.length > 0 ? (
          <div className="space-y-2">
            {recentEssays.map(essay => (
              <button
                key={essay.id}
                onClick={() => onSelectEssay?.(essay.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 border-l-3 ${
                  activeEssayId === essay.id
                    ? "bg-gray-100 dark:bg-gray-700 border-l-purple-600"
                    : "bg-white dark:bg-gray-800 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    activeEssayId === essay.id ? "text-purple-600" : "text-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {essay.title || "Untitled Essay"}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{essay.word_count.toLocaleString()} words</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(essay.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No recent essays.
            <br />
            Create one to get started!
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="px-4 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Templates
        </h3>

        <div className="space-y-1">
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate?.(template.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-base">{template.icon}</span>
              <span>{template.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
