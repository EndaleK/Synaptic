"use client"

import { useState } from "react"
import { Lightbulb, Loader2, Download, Copy, CheckCircle, FileText, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface OutlineGeneratorProps {
  essayTopic: string
  writingType: 'academic' | 'professional' | 'creative'
  targetWordCount?: number
  onOutlineGenerated?: (outline: string) => void
  className?: string
}

interface OutlineSection {
  title: string
  points: string[]
  subsections?: OutlineSection[]
}

/**
 * OutlineGenerator - AI-powered essay outline creation for planning stage
 *
 * Based on research: "The planning stage is critical for organizing thoughts
 * and establishing structure before drafting" (Process Writing Theory)
 *
 * Helps students:
 * - Organize ideas before drafting
 * - Establish clear thesis and arguments
 * - Create logical flow of information
 * - Reduce cognitive load during drafting
 */
export default function OutlineGenerator({
  essayTopic,
  writingType,
  targetWordCount,
  onOutlineGenerated,
  className
}: OutlineGeneratorProps) {

  const [isGenerating, setIsGenerating] = useState(false)
  const [outline, setOutline] = useState<string>('')
  const [outlineStructure, setOutlineStructure] = useState<OutlineSection[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Additional parameters
  const [includeThesis, setIncludeThesis] = useState(true)
  const [outlineStyle, setOutlineStyle] = useState<'traditional' | 'detailed' | 'minimal'>('traditional')

  const handleGenerate = async () => {
    if (!essayTopic.trim()) {
      setError('Please enter an essay topic or thesis statement')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/writing/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: essayTopic,
          writingType,
          targetWordCount,
          includeThesis,
          outlineStyle
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate outline')
      }

      const data = await response.json()
      setOutline(data.outline)
      if (data.structure) {
        setOutlineStructure(data.structure)
      }

      if (onOutlineGenerated) {
        onOutlineGenerated(data.outline)
      }
    } catch (err: any) {
      console.error('Outline generation error:', err)
      setError(err.message || 'Failed to generate outline')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outline)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([outline], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outline-${essayTopic.slice(0, 30).replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Outline Generator
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a structured outline to organize your ideas before drafting
          </p>
        </div>
      </div>

      {/* Generation Options */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Outline Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'minimal', label: 'Minimal', desc: 'Key points only' },
              { value: 'traditional', label: 'Traditional', desc: 'Balanced detail' },
              { value: 'detailed', label: 'Detailed', desc: 'Comprehensive' }
            ].map((style) => (
              <button
                key={style.value}
                onClick={() => setOutlineStyle(style.value as any)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-left",
                  outlineStyle === style.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                )}
              >
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {style.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {style.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeThesis"
            checked={includeThesis}
            onChange={(e) => setIncludeThesis(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="includeThesis" className="text-sm text-gray-700 dark:text-gray-300">
            Include thesis statement suggestion
          </label>
        </div>

        {targetWordCount && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Target className="w-4 h-4" />
            <span>Target: {targetWordCount} words</span>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !essayTopic.trim()}
        className={cn(
          "w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
          "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
          "text-white shadow-lg hover:shadow-xl",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Outline...
          </>
        ) : (
          <>
            <Lightbulb className="w-5 h-5" />
            Generate Outline
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Generated Outline Display */}
      {outline && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generated Outline
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Download as text file"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {outline}
            </pre>
          </div>

          {/* Helpful Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Next Steps:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Review and customize the outline to fit your vision</li>
              <li>Add or remove sections as needed</li>
              <li>Use this as a roadmap when you start drafting</li>
              <li>Remember: The outline is a guide, not a constraint</li>
            </ul>
          </div>
        </div>
      )}

      {/* Example Prompts (if no topic entered) */}
      {!essayTopic.trim() && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Example Topics:
          </p>
          <div className="space-y-1.5">
            {[
              'The impact of social media on mental health',
              'Climate change solutions for urban areas',
              'The role of AI in education',
              'Ethical considerations in genetic engineering'
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => {
                  // This would set the topic in the parent component
                  // For now, just show it as an example
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
