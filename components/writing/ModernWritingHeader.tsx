"use client"

import { useState } from "react"
import { BookOpen, Share2, Save, Download, Upload } from "lucide-react"

interface ModernWritingHeaderProps {
  onSave?: () => void
  onExport?: () => void
  onShare?: () => void
  onUpload?: () => void
  isSaving?: boolean
  showResearch?: boolean
}

export default function ModernWritingHeader({
  onSave,
  onExport,
  onShare,
  onUpload,
  isSaving = false,
  showResearch = true
}: ModernWritingHeaderProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)

  return (
    <header className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-6 py-4 shadow-lg">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h1 className="text-xl font-bold tracking-tight">Writer</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {showResearch && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 transition-all duration-200 text-sm font-semibold"
              onClick={() => {
                // Open research panel or modal
                console.log("Research clicked")
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Research</span>
            </button>
          )}

          {onShare && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 transition-all duration-200 text-sm font-semibold"
              onClick={onShare}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          )}

          {onUpload && (
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 transition-all duration-200 text-sm font-semibold"
              onClick={onUpload}
              title="Import document"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
          )}

          {/* Save Button with Export Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-purple-600 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>

              {onExport && (
                <button
                  className="px-2 py-2 rounded-lg bg-white hover:bg-gray-100 text-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  title="Export options"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Export Dropdown */}
            {isExportMenuOpen && onExport && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  onClick={() => {
                    onExport()
                    setIsExportMenuOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>Export as PDF</span>
                  </div>
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                  onClick={() => {
                    // Export as DOCX
                    console.log("Export as DOCX")
                    setIsExportMenuOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>Export as DOCX</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
