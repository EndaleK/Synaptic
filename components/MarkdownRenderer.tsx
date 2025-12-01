"use client"

import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'

interface MarkdownRendererProps {
  content: string
  className?: string
  /**
   * If true, Mermaid diagrams will be shown as code blocks instead of rendered.
   * Use this for streaming content to avoid rendering incomplete diagrams.
   */
  disableDiagrams?: boolean
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Patrick Hand, cursive',
})

export default function MarkdownRenderer({ content, className = '', disableDiagrams = false }: MarkdownRendererProps) {
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<string, string>>(new Map())
  const [pendingDiagrams, setPendingDiagrams] = useState<Set<string>>(new Set())
  const diagramCodeMap = useRef<Map<string, number>>(new Map())
  const diagramCounter = useRef(0)
  const diagramsToQueue = useRef<Set<string>>(new Set())

  // Reset state when content changes
  useEffect(() => {
    setRenderedDiagrams(new Map())
    setPendingDiagrams(new Set())
    diagramCodeMap.current.clear()
    diagramCounter.current = 0
    diagramsToQueue.current.clear()
  }, [content])

  // Transfer diagrams from ref to state after render
  useEffect(() => {
    if (diagramsToQueue.current.size > 0) {
      const toQueue = new Set(diagramsToQueue.current)
      diagramsToQueue.current.clear()
      setPendingDiagrams(prev => new Set([...prev, ...toQueue]))
    }
  })

  // Process pending diagrams after render
  useEffect(() => {
    if (pendingDiagrams.size === 0) return

    const processDiagrams = async () => {
      // Get current pending diagrams
      const toProcess = Array.from(pendingDiagrams)
      setPendingDiagrams(new Set()) // Clear pending immediately to avoid re-processing

      // Process each diagram
      for (const key of toProcess) {
        const codeEntry = Array.from(diagramCodeMap.current.entries())
          .find(([_, id]) => `diagram-${id}` === key)

        if (codeEntry) {
          const [code, _] = codeEntry
          await renderMermaidDiagram(code, key)
        }
      }
    }

    processDiagrams()
  }, [pendingDiagrams])

  const isValidMermaidCode = (code: string): boolean => {
    if (!code || !code.trim()) return false

    const trimmed = code.trim()
    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    // Must have at least 2 lines (diagram type + content)
    if (lines.length < 2) return false

    // First line must not be a numbered list item
    const firstLine = lines[0].toLowerCase()
    if (/^\d+\./.test(firstLine)) return false

    // Must start with a valid diagram type
    const validTypes = ['graph', 'flowchart', 'sequencediagram', 'classdiagram', 'statediagram',
                       'erdiagram', 'gantt', 'pie', 'journey', 'gitgraph', 'mindmap', 'timeline']

    const hasValidType = validTypes.some(type => firstLine.startsWith(type))
    if (!hasValidType) return false

    // CRITICAL: Reject if ANY line looks like a numbered list (markdown contamination)
    const hasNumberedList = lines.some(line => /^\d+\./.test(line))
    if (hasNumberedList) {
      console.warn('⚠️ Rejecting Mermaid: contains numbered list items', lines.filter(l => /^\d+\./.test(l)))
      return false
    }

    return true
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

      // Clean up the code: fix multiline node labels that got split
      // Replace line breaks within brackets to keep labels on one line
      let cleanedCode = code.trim()

      // Fix incomplete node labels ONLY if line ends with unclosed bracket
      // Do NOT fix lines with multiple complete node labels like: A[X] --> B[Y]
      const lines = cleanedCode.split('\n')
      const fixedLines: string[] = []
      let i = 0

      while (i < lines.length) {
        let currentLine = lines[i].trim()

        // Only fix if line ENDS with an incomplete label (e.g., "A[Something" without "]")
        // Check last token after splitting by whitespace
        const tokens = currentLine.split(/\s+/)
        const lastToken = tokens[tokens.length - 1]

        // If last token has unclosed bracket, it needs fixing
        const hasUnclosedBracket = lastToken.includes('[') && !lastToken.includes(']')

        if (hasUnclosedBracket && i + 1 < lines.length) {
          // Join with next line until we find the closing bracket
          let j = i + 1
          while (j < lines.length) {
            const nextLine = lines[j].trim()
            currentLine += ' ' + nextLine

            // Check if we now have the closing bracket
            const updatedTokens = currentLine.split(/\s+/)
            const updatedLastToken = updatedTokens[updatedTokens.length - 1]
            if (updatedLastToken.includes(']')) break

            j++
          }
          i = j
        }

        fixedLines.push(currentLine)
        i++
      }

      cleanedCode = fixedLines.join('\n')

      const id = `mermaid-${Date.now()}-${key}`
      const { svg } = await mermaid.render(id, cleanedCode)

      setRenderedDiagrams(prev => new Map(prev).set(key, svg || 'FAILED'))
    } catch (error: unknown) {
      console.error('Mermaid rendering error:', error)
      setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
    }
  }

  if (!content) {
    return null
  }

  return (
    <div className={`${className} overflow-wrap-anywhere w-full`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block renderer to detect mermaid diagrams
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            // Extract code string properly - children can be string or array
            let codeString = ''
            if (typeof children === 'string') {
              codeString = children
            } else if (Array.isArray(children)) {
              codeString = children.join('')
            } else {
              codeString = String(children)
            }
            codeString = codeString.replace(/\n$/, '')

            // Check if it's a mermaid diagram
            if (!inline && language === 'mermaid') {
              // If diagrams are disabled (streaming), show as code block
              if (disableDiagrams) {
                return (
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                )
              }

              const diagramKey = getDiagramKey(codeString)
              const svg = renderedDiagrams.get(diagramKey)

              // If not rendered yet, queue for rendering
              if (!svg) {
                // Queue diagram for async rendering (happens in useEffect)
                if (!pendingDiagrams.has(diagramKey)) {
                  diagramsToQueue.current.add(diagramKey)
                }

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
                  className="mermaid-container my-4 w-full overflow-x-auto"
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
            return <h1 className="text-2xl font-bold mt-6 mb-4 break-words w-full text-left">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3 break-words w-full text-left">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2 break-words w-full text-left">{children}</h3>
          },
          // Style lists
          ul({ children }) {
            return <ul className="list-disc list-inside my-3 space-y-1 break-words">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-3 space-y-1 break-words">{children}</ol>
          },
          // Style paragraphs
          p({ children }) {
            return <p className="my-2 leading-relaxed break-words w-full text-left">{children}</p>
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
