"use client"

import { useState } from "react"
import { ChevronRight, Home, FileText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUIStore, useDocumentStore } from "@/lib/store/useStore"
import { cn } from "@/lib/utils"
import DocumentSwitcherModal from "./DocumentSwitcherModal"

interface BreadcrumbItem {
  label: string
  href?: string
  mode?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
  onDocumentSwitch?: () => void
}

// Predefined breadcrumb configurations
export const documentsBreadcrumb: BreadcrumbItem[] = [
  { label: "Home", href: "/dashboard", mode: "home" },
  { label: "Documents" }
]

export const settingsBreadcrumb: BreadcrumbItem[] = [
  { label: "Home", href: "/dashboard", mode: "home" },
  { label: "Settings" }
]

export default function Breadcrumb({ items, className, onDocumentSwitch }: BreadcrumbProps = {}) {
  const pathname = usePathname()
  const { activeMode } = useUIStore()
  const { currentDocument } = useDocumentStore()
  const [showSwitcher, setShowSwitcher] = useState(false)

  // Modes that require a document to be selected
  const documentRequiredModes = ['flashcards', 'chat', 'podcast', 'mindmap', 'studyguide']
  const showSelectDocumentButton = documentRequiredModes.includes(activeMode)

  // Generate breadcrumb items based on current route and mode
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    // If items are provided as props, use them
    if (items && items.length > 0) {
      return items
    }

    const generatedItems: BreadcrumbItem[] = [
      { label: "Home", href: "/dashboard", mode: "home" }
    ]

    // Dashboard pages
    if (pathname === "/dashboard") {
      if (activeMode !== "home") {
        // Add mode-specific breadcrumb
        const modeLabels: Record<string, string> = {
          studyBuddy: "Study Buddy",
          flashcards: "Flashcards",
          chat: "Chat with Document",
          podcast: "Podcast Learning",
          "quick-summary": "Quick Summary",
          mindmap: "Mind Map",
          writer: "Writing Assistant",
          video: "Video Learning",
          exam: "Mock Exam"
        }

        if (modeLabels[activeMode]) {
          generatedItems.push({ label: modeLabels[activeMode] })
        }
      }
    } else if (pathname.startsWith("/dashboard/")) {
      // Split path and create breadcrumb
      const segments = pathname.split("/").filter(Boolean)

      // Skip "dashboard" since it's in Home
      for (let i = 1; i < segments.length; i++) {
        const segment = segments[i]
        const href = "/" + segments.slice(0, i + 1).join("/")

        // Format segment name (capitalize, replace hyphens)
        const label = segment
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")

        // Don't make the last item clickable
        if (i === segments.length - 1) {
          generatedItems.push({ label })
        } else {
          generatedItems.push({ label, href })
        }
      }
    }

    return generatedItems
  }

  const breadcrumbItems = getBreadcrumbItems()

  // Don't show breadcrumb if we're just on home
  if (breadcrumbItems.length <= 1 && activeMode === "home") {
    return null
  }

  return (
    <>
      <nav className={cn("flex items-center gap-1 text-sm mb-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0", className)}>
        {breadcrumbItems.map((item, index) => (
          <div key={index} className="flex items-center gap-1 flex-shrink-0">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
            )}

            {item.href ? (
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.mode && pathname === "/dashboard") {
                    e.preventDefault()
                    // Use store to set mode instead of navigation
                    const { setActiveMode } = useUIStore.getState()
                    setActiveMode(item.mode as any)
                  }
                }}
                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-accent-primary dark:hover:text-accent-primary transition-colors"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                <span className="hover:underline">{item.label}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1 text-gray-900 dark:text-white font-medium">
                {index === 0 && <Home className="w-4 h-4" />}
                <span>{item.label}</span>
              </div>
            )}
          </div>
        ))}

        {/* Select Document button - shows for document-dependent modes */}
        {showSelectDocumentButton && (
          <>
            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => setShowSwitcher(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors flex-shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {currentDocument ? 'Switch Document' : 'Select Document'}
              </span>
              <span className="sm:hidden">Document</span>
            </button>
          </>
        )}
      </nav>

      {/* Document Switcher Modal */}
      <DocumentSwitcherModal
        isOpen={showSwitcher}
        onClose={() => setShowSwitcher(false)}
        onDocumentSwitch={() => {
          setShowSwitcher(false)
          onDocumentSwitch?.()
        }}
      />
    </>
  )
}
