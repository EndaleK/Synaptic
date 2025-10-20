"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, List, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DocumentSection } from "@/lib/document-parser/section-detector"

interface SectionNavigatorProps {
  sections: DocumentSection[]
  currentSectionId?: string
  onSectionClick: (section: DocumentSection) => void
}

export default function SectionNavigator({
  sections,
  currentSectionId,
  onSectionClick,
}: SectionNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  if (!sections || sections.length === 0) {
    return null
  }

  // Only show navigator if there are multiple sections (not just "Full Document")
  if (sections.length === 1 && sections[0].title === "Full Document") {
    return null
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const renderSection = (section: DocumentSection, depth: number = 0) => {
    const hasChildren = section.children && section.children.length > 0
    const isExpanded = expandedSections.has(section.id)
    const isCurrent = section.id === currentSectionId

    return (
      <div key={section.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(section.id)
            }
            onSectionClick(section)
          }}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md transition-all group flex items-center gap-2",
            isCurrent
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold"
              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
          <span className={cn("text-sm truncate", !hasChildren && "ml-6")}>
            {section.title}
          </span>
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {section.children!.map((child) => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-6 z-40 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
        title="Table of Contents"
      >
        {isOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar Panel */}
          <div className="fixed left-0 top-0 bottom-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <List className="w-5 h-5" />
                  Table of Contents
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sections.length} {sections.length === 1 ? "section" : "sections"}
              </p>
            </div>

            {/* Sections List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sections.map((section) => renderSection(section))}
            </div>

            {/* Footer Tip */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Click a section to navigate
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
