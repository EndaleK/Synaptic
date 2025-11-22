"use client"

import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Patrick Hand, cursive',
})

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<string, string>>(new Map())
  const diagramCodeMap = useRef<Map<string, number>>(new Map())
  const diagramCounter = useRef(0)

  // Reset state when content changes
  useEffect(() => {
    setRenderedDiagrams(new Map())
    diagramCodeMap.current.clear()
    diagramCounter.current = 0
  }, [content])

  const isValidMermaidCode = (code: string): boolean => {
    if (!code || !code.trim()) return false

    const trimmed = code.trim()
    const lines = trimmed.split('\n')

    // Must have at least 2 lines (diagram type + content)
    if (lines.length < 2) return false

    // First line must not be a numbered list item
    const firstLine = lines[0].trim().toLowerCase()
    if (/^\d+\./.test(firstLine)) return false

    // Must start with a valid diagram type
    const validTypes = ['graph', 'flowchart', 'sequencediagram', 'classdiagram', 'statediagram',
                       'erdiagram', 'gantt', 'pie', 'journey', 'gitgraph', 'mindmap', 'timeline']
    return validTypes.some(type => firstLine.startsWith(type))
  }

  const getDiagramKey = (code: string): string => {
    // Check if we've seen this code before
    if (!diagramCodeMap.current.has(code)) {
      diagramCodeMap.current.set(code, diagramCounter.current++)
    }
    return `diagram-${diagramCodeMap.current.get(code)}`
  }

  const renderMermaidDiagram = async (code: string, key: string): Promise<void> => {
    try {
      // Validate before attempting to render
      if (!isValidMermaidCode(code)) {
        setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
        return
      }

      const id = `mermaid-${Date.now()}-${key}`
      const { svg } = await mermaid.render(id, code.trim())

      setRenderedDiagrams(prev => new Map(prev).set(key, svg || 'FAILED'))
    } catch (error: any) {
      console.error('Mermaid rendering error:', error)
      setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
    }
  }

  if (!content) {
    return null
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block renderer to detect mermaid diagrams
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')

            // Check if it's a mermaid diagram
            if (!inline && language === 'mermaid') {
              const diagramKey = getDiagramKey(codeString)
              const svg = renderedDiagrams.get(diagramKey)

              // If not rendered yet, trigger rendering
              if (!svg) {
                // Trigger async rendering
                renderMermaidDiagram(codeString, diagramKey)

                // Show loading state
                return (
                  <div className="my-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
                    Rendering diagram...
                  </div>
                )
              }

              // Rendering failed - show as code block
              if (svg === 'FAILED') {
                return (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                )
              }

              // Render the diagram
              return (
                <div
                  className="mermaid-container my-4"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )
            }

            // Regular code block
            return !inline ? (
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm" {...props}>
                {children}
              </code>
            )
          },
          // Style tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                {children}
              </td>
            )
          },
          // Style headers
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
          },
          // Style lists
          ul({ children }) {
            return <ul className="list-disc list-inside my-3 space-y-1">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-3 space-y-1">{children}</ol>
          },
          // Style paragraphs
          p({ children }) {
            return <p className="my-2 leading-relaxed">{children}</p>
          },
          // Style links
          a({ children, href }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            )
          },
          // Style blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
