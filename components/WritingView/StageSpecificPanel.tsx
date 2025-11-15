"use client"

import { Lightbulb, PenTool, RefreshCw, CheckCheck, Send } from "lucide-react"
import type { WritingStage } from "@/lib/supabase/types"
import OutlineGenerator from "./OutlineGenerator"
import DiffViewer from "./DiffViewer"
import { cn } from "@/lib/utils"

interface StageSpecificPanelProps {
  currentStage: WritingStage
  essayTopic: string
  essayContent: string
  writingType: 'academic' | 'professional' | 'creative'
  targetWordCount?: number
  versions: Array<{
    version_number: number
    content: string
    timestamp: string
    word_count: number
  }>
  onOutlineGenerated?: (outline: string) => void
  className?: string
}

/**
 * StageSpecificPanel - Renders stage-appropriate tools and guidance
 *
 * Based on Process Writing Theory: Each stage has distinct goals
 * and requires different support strategies
 *
 * Planning: Outline generation, brainstorming, research
 * Drafting: Minimal distractions, word count goals, flow
 * Revising: Structure analysis, paragraph reordering, diff viewer
 * Editing: Grammar/style suggestions, citation checking
 * Publishing: Final polish, AI disclosure, submission prep
 */
export default function StageSpecificPanel({
  currentStage,
  essayTopic,
  essayContent,
  writingType,
  targetWordCount,
  versions,
  onOutlineGenerated,
  className
}: StageSpecificPanelProps) {

  const renderStageContent = () => {
    switch (currentStage) {
      case 'planning':
        return (
          <div className="space-y-6">
            {/* Planning Stage Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                    Planning Stage
                  </h3>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    Organize your ideas before you start writing. A good outline is the foundation of a great essay.
                  </p>
                </div>
              </div>
            </div>

            {/* Outline Generator */}
            <OutlineGenerator
              essayTopic={essayTopic}
              writingType={writingType}
              targetWordCount={targetWordCount}
              onOutlineGenerated={onOutlineGenerated}
            />

            {/* Planning Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📝 Planning Best Practices:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                <li>Spend 20-30% of your writing time on planning</li>
                <li>Identify your main argument or thesis early</li>
                <li>Organize supporting points logically</li>
                <li>Consider your audience and purpose</li>
                <li>Don't worry about perfect wording - just capture ideas</li>
              </ul>
            </div>
          </div>
        )

      case 'drafting':
        return (
          <div className="space-y-6">
            {/* Drafting Stage Header */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg border border-sky-200 dark:border-sky-800 p-4">
              <div className="flex items-start gap-3">
                <PenTool className="w-6 h-6 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-sky-900 dark:text-sky-100 mb-1">
                    Drafting Stage
                  </h3>
                  <p className="text-sm text-sky-800 dark:text-sky-200">
                    Focus on getting your ideas down. Don't worry about perfection - you'll polish it later.
                  </p>
                </div>
              </div>
            </div>

            {/* Drafting Encouragement */}
            <div className="bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 rounded-lg border border-sky-300 dark:border-sky-700 p-6 text-center">
              <div className="mb-3">
                <span className="text-4xl">✍️</span>
              </div>
              <h4 className="text-lg font-semibold text-sky-900 dark:text-sky-100 mb-2">
                Write Freely
              </h4>
              <p className="text-sm text-sky-800 dark:text-sky-200 mb-4">
                Grammar checking is turned off during drafting to help you maintain your flow and creativity.
              </p>
              <div className="text-xs text-sky-700 dark:text-sky-300">
                Current word count: <span className="font-bold">{essayContent.split(/\s+/).filter(w => w.length > 0).length}</span>
                {targetWordCount && <span> / {targetWordCount} goal</span>}
              </div>
            </div>

            {/* Drafting Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                💡 Drafting Tips:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                <li>Write continuously without stopping to edit</li>
                <li>Follow your outline but allow for organic development</li>
                <li>Use placeholders for facts you need to verify later</li>
                <li>Keep your momentum - resist the urge to perfect each sentence</li>
                <li>Save frequently and take breaks when needed</li>
              </ul>
            </div>
          </div>
        )

      case 'revising':
        return (
          <div className="space-y-6">
            {/* Revising Stage Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Revising Stage
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Improve your content, structure, and arguments. This is where good writing becomes great.
                  </p>
                </div>
              </div>
            </div>

            {/* Diff Viewer */}
            <DiffViewer
              versions={versions}
              currentContent={essayContent}
            />

            {/* Revision Focus Areas */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🔍 Revision Checklist:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                <li>Does your thesis clearly state your main argument?</li>
                <li>Do your paragraphs follow a logical order?</li>
                <li>Are your topic sentences clear and related to the thesis?</li>
                <li>Have you provided sufficient evidence for your claims?</li>
                <li>Are transitions smooth between paragraphs?</li>
                <li>Does your conclusion tie everything together effectively?</li>
              </ul>
            </div>
          </div>
        )

      case 'editing':
        return (
          <div className="space-y-6">
            {/* Editing Stage Header */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-lg border border-rose-200 dark:border-rose-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCheck className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-1">
                    Editing Stage
                  </h3>
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    Polish your grammar, style, and citations. Focus on clarity and correctness.
                  </p>
                </div>
              </div>
            </div>

            {/* Editing Info */}
            <div className="bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/30 dark:to-purple-900/30 rounded-lg border border-rose-300 dark:border-rose-700 p-6 text-center">
              <div className="mb-3">
                <span className="text-4xl">✨</span>
              </div>
              <h4 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-2">
                AI Suggestions Active
              </h4>
              <p className="text-sm text-rose-800 dark:text-rose-200">
                Grammar, style, and clarity suggestions are now enabled. Check the suggestions panel on the right for detailed feedback.
              </p>
            </div>

            {/* Editing Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ✏️ Editing Focus Areas:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                <li>Read your essay aloud to catch awkward phrasing</li>
                <li>Check for consistent verb tense throughout</li>
                <li>Eliminate redundant words and phrases</li>
                <li>Vary sentence structure for better flow</li>
                <li>Ensure citation format is consistent</li>
                <li>Proofread multiple times, focusing on different aspects each time</li>
              </ul>
            </div>
          </div>
        )

      case 'publishing':
        return (
          <div className="space-y-6">
            {/* Publishing Stage Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-4">
              <div className="flex items-start gap-3">
                <Send className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                    Publishing Stage
                  </h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    Final preparations for submission. Ensure everything is perfect before you submit.
                  </p>
                </div>
              </div>
            </div>

            {/* Publishing Checklist */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
                📋 Pre-Submission Checklist:
              </h4>
              <div className="space-y-2">
                {[
                  'Format matches assignment requirements',
                  'All citations are complete and properly formatted',
                  'Works Cited/References page is included',
                  'Page numbers and headers are correct',
                  'File is named according to requirements',
                  'AI tool usage is disclosed (if required)',
                  'One final proofread completed'
                ].map((item, index) => (
                  <label key={index} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-emerald-800 dark:text-emerald-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-100">
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export & Submit Options */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                💡 Final Steps:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5 list-disc list-inside">
                <li>Export your essay using the export button in the main panel</li>
                <li>Review the AI disclosure statement if applicable</li>
                <li>Save a backup copy before submitting</li>
                <li>Double-check the submission platform and deadline</li>
                <li>Celebrate completing your writing process! 🎉</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className="p-6">
        {renderStageContent()}
      </div>
    </div>
  )
}
