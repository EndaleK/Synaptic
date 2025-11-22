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
  const diagramIdCounter = useRef(0)

  useEffect(() => {
    // Reset when content changes
    setRenderedDiagrams(new Map())
    diagramIdCounter.current = 0
  }, [content])

  const decodeHTMLEntities = (text: string): string => {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }

  const isValidMermaidCode = (code: string): boolean => {
    // Must start with a valid diagram type
    const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
                       'erDiagram', 'gantt', 'pie', 'journey', 'gitGraph', 'mindmap', 'timeline']
    const firstLine = code.trim().split('\n')[0].toLowerCase()
    return validTypes.some(type => firstLine.startsWith(type))
  }

  const renderMermaidDiagram = async (code: string): Promise<string> => {
    if (!code || !code.trim()) {
      return ''
    }

    try {
      // Decode HTML entities that may have been escaped by markdown renderer
      const decodedCode = decodeHTMLEntities(code.trim())

      // Validate it's actually Mermaid syntax before attempting to render
      if (!isValidMermaidCode(decodedCode)) {
        console.warn('Invalid Mermaid syntax, skipping:', decodedCode.substring(0, 50))
        return ''
      }

      const id = `mermaid-${Date.now()}-${diagramIdCounter.current++}`
      const { svg } = await mermaid.render(id, decodedCode)
      return svg
    } catch (error: any) {
      console.error('Mermaid rendering error:', error)
      // Return empty string instead of error message for better UX
      // The original code block will be shown as a code block instead
      return ''
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
              // Use a unique key for this diagram
              const diagramKey = `${codeString.substring(0, 50)}-${codeString.length}`

              // If we haven't rendered this diagram yet, render it
              if (!renderedDiagrams.has(diagramKey)) {
                renderMermaidDiagram(codeString).then((svg) => {
                  // Store the result (even if empty) to prevent re-rendering attempts
                  setRenderedDiagrams(prev => new Map(prev).set(diagramKey, svg || 'FAILED'))
                })

                // Show loading state
                return (
                  <div className="my-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
                    Rendering diagram...
                  </div>
                )
              }

              // Render the cached SVG
              const svg = renderedDiagrams.get(diagramKey)

              // If rendering failed, fall back to showing code block
              if (!svg || svg === 'FAILED') {
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
            // Check if children contains code blocks (which cannot be inside <p> tags)
            const hasCodeBlock = React.Children.toArray(children).some(
              (child: any) => child?.type === 'pre' || child?.props?.node?.tagName === 'pre'
            )

            // If it has code blocks, use a div instead of p to avoid invalid HTML
            if (hasCodeBlock) {
              return <div className="my-2 leading-relaxed">{children}</div>
            }

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
