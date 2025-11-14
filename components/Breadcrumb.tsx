"use client"

import { ChevronRight, Home } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUIStore } from "@/lib/store/useStore"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  mode?: string
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const { activeMode } = useUIStore()

  // Generate breadcrumb items based on current route and mode
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: "Home", href: "/dashboard", mode: "home" }
    ]

    // Dashboard pages
    if (pathname === "/dashboard") {
      if (activeMode !== "home") {
        // Add mode-specific breadcrumb
        const modeLabels: Record<string, string> = {
          flashcards: "Flashcards",
          chat: "Chat with Document",
          podcast: "Podcast Learning",
          mindmap: "Mind Map",
          writer: "Writing Assistant",
          video: "Video Learning",
          exam: "Mock Exam"
        }

        if (modeLabels[activeMode]) {
          items.push({ label: modeLabels[activeMode] })
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
          items.push({ label })
        } else {
          items.push({ label, href })
        }
      }
    }

    return items
  }

  const breadcrumbItems = getBreadcrumbItems()

  // Don't show breadcrumb if we're just on home
  if (breadcrumbItems.length <= 1 && activeMode === "home") {
    return null
  }

  return (
    <nav className="flex items-center gap-1 text-sm mb-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
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
    </nav>
  )
}
