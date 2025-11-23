"use client"

import { Mic, Upload, Check, Sparkles, Menu, X } from "lucide-react"
import { useState } from "react"
import type { Editor } from "@tiptap/react"

interface ModernToolbarProps {
  editor: Editor | null
  onVoiceClick?: () => void
  onUploadClick?: () => void
  onAnalyze?: () => void
  onImprove?: () => void
  citationStyle?: string
  onCitationStyleChange?: (style: string) => void
  writingTone?: string
  onWritingToneChange?: (tone: string) => void
}

const CITATION_STYLES = [
  { value: "APA", label: "APA" },
  { value: "MLA", label: "MLA" },
  { value: "Chicago", label: "Chicago" },
  { value: "Harvard", label: "Harvard" }
]

const WRITING_TONES = [
  { value: "academic", label: "📚 Academic", icon: "📚" },
  { value: "professional", label: "📝 Professional", icon: "📝" },
  { value: "casual", label: "💬 Casual", icon: "💬" }
]

const TEXT_STYLES = [
  { value: "paragraph", label: "Normal Text" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "blockquote", label: "Quote" }
]

export default function ModernToolbar({
  editor,
  onVoiceClick,
  onUploadClick,
  onAnalyze,
  onImprove,
  citationStyle = "APA",
  onCitationStyleChange,
  writingTone = "academic",
  onWritingToneChange
}: ModernToolbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!editor) return null

  const handleTextStyleChange = (style: string) => {
    switch (style) {
      case "heading1":
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run()
        break
      default:
        editor.chain().focus().setParagraph().run()
    }
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 sm:px-6 py-2 sm:py-3">
      {/* Mobile: Hamburger + Essential Buttons */}
      <div className="flex md:hidden items-center justify-between gap-2">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          title="Toggle formatting menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2">
          {onVoiceClick && (
            <button
              onClick={onVoiceClick}
              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              title="Voice to Text"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          {onImprove && (
            <button
              onClick={onImprove}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-md text-sm font-semibold hover:shadow-lg transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden xs:inline">Improve</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Collapsible Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Text Formatting Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-3 py-1.5 rounded-md border transition-all duration-200 font-bold text-sm ${
                editor.isActive("bold")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
              title="Bold"
            >
              B
            </button>

            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-3 py-1.5 rounded-md border transition-all duration-200 italic text-sm ${
                editor.isActive("italic")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
              title="Italic"
            >
              I
            </button>

            <button
              onClick={() => editor.chain().focus().toggleUnderline?.().run()}
              className={`px-3 py-1.5 rounded-md border transition-all duration-200 underline text-sm ${
                editor.isActive("underline")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }`}
              title="Underline"
            >
              U
            </button>

            <select
              className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              onChange={(e) => handleTextStyleChange(e.target.value)}
              value={
                editor.isActive("heading", { level: 1 })
                  ? "heading1"
                  : editor.isActive("heading", { level: 2 })
                  ? "heading2"
                  : editor.isActive("blockquote")
                  ? "blockquote"
                  : "paragraph"
              }
            >
              {TEXT_STYLES.map(style => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tone & Citation Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="flex-1 min-w-[140px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              value={writingTone}
              onChange={(e) => onWritingToneChange?.(e.target.value)}
            >
              {WRITING_TONES.map(tone => (
                <option key={tone.value} value={tone.value}>
                  {tone.label}
                </option>
              ))}
            </select>

            <select
              className="flex-1 min-w-[100px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              value={citationStyle}
              onChange={(e) => onCitationStyleChange?.(e.target.value)}
            >
              {CITATION_STYLES.map(style => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            {onUploadClick && (
              <button
                onClick={onUploadClick}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300"
                title="Upload Files"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            )}

            {onAnalyze && (
              <button
                onClick={onAnalyze}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Check className="w-4 h-4" />
                <span>Check</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop: Full Toolbar */}
      <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
        {/* Left Section - Text Formatting */}
        <div className="flex items-center gap-2">
          {/* Bold, Italic, Underline */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1.5 rounded-md border transition-all duration-200 font-bold text-sm ${
              editor.isActive("bold")
                ? "bg-purple-600 border-purple-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="Bold (Cmd+B)"
          >
            B
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1.5 rounded-md border transition-all duration-200 italic text-sm ${
              editor.isActive("italic")
                ? "bg-purple-600 border-purple-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="Italic (Cmd+I)"
          >
            I
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline?.().run()}
            className={`px-3 py-1.5 rounded-md border transition-all duration-200 underline text-sm ${
              editor.isActive("underline")
                ? "bg-purple-600 border-purple-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="Underline (Cmd+U)"
          >
            U
          </button>

          <span className="text-gray-300 dark:text-gray-600">|</span>

          {/* Text Style Selector */}
          <select
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:outline-none transition-all duration-200"
            onChange={(e) => handleTextStyleChange(e.target.value)}
            value={
              editor.isActive("heading", { level: 1 })
                ? "heading1"
                : editor.isActive("heading", { level: 2 })
                ? "heading2"
                : editor.isActive("blockquote")
                ? "blockquote"
                : "paragraph"
            }
          >
            {TEXT_STYLES.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        {/* Middle Section - Voice & Upload */}
        <div className="flex items-center gap-2">
          {onVoiceClick && (
            <button
              onClick={onVoiceClick}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              title="Voice to Text"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              title="Upload Files"
            >
              <Upload className="w-4 h-4" />
            </button>
          )}

          <span className="text-gray-300 dark:text-gray-600">|</span>

          {/* Writing Tone Selector */}
          <select
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:outline-none transition-all duration-200"
            value={writingTone}
            onChange={(e) => onWritingToneChange?.(e.target.value)}
          >
            {WRITING_TONES.map(tone => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Section - Citation & AI Tools */}
        <div className="flex items-center gap-2">
          {/* Citation Style */}
          <select
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:outline-none transition-all duration-200"
            value={citationStyle}
            onChange={(e) => onCitationStyleChange?.(e.target.value)}
          >
            {CITATION_STYLES.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>

          {/* AI Buttons */}
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-purple-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <Check className="w-4 h-4" />
              <span>Check</span>
            </button>
          )}

          {onImprove && (
            <button
              onClick={onImprove}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-md text-sm font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              <span>Improve</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
