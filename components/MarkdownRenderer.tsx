"use client"

import React, { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  /**
   * If true, Mermaid diagrams will be shown as code blocks instead of rendered.
   * Use this for streaming content to avoid rendering incomplete diagrams.
   */
  disableDiagrams?: boolean
}

// Track if mermaid is initialized (avoid re-initialization issues in production)
let mermaidInitialized = false

// Initialize Mermaid only once
const initializeMermaid = () => {
  if (mermaidInitialized) return

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      suppressErrors: true,
      // Fix for production: ensure proper rendering
      flowchart: {
        useMaxWidth: false, // Allow diagram to expand to fit text
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 50, // More space between nodes
        rankSpacing: 50, // More space between ranks
        padding: 15, // More padding inside nodes
      },
      // Increase timeout for complex diagrams
      maxTextSize: 50000,
      // Ensure text doesn't get truncated
      themeVariables: {
        fontSize: '14px',
      },
    })
    mermaidInitialized = true
    console.log('[Mermaid] Initialized successfully')
  } catch (error) {
    console.error('[Mermaid] Initialization error:', error)
  }
}

export default function MarkdownRenderer({ content, className = '', disableDiagrams = false }: MarkdownRendererProps) {
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<string, string>>(new Map())
  const [pendingDiagrams, setPendingDiagrams] = useState<Set<string>>(new Set())
  const [isClient, setIsClient] = useState(false)
  const diagramCodeMap = useRef<Map<string, number>>(new Map())
  const diagramCounter = useRef(0)
  const diagramsToQueue = useRef<Set<string>>(new Set())

  // Initialize mermaid on client side only (fixes SSR issues)
  useEffect(() => {
    setIsClient(true)
    initializeMermaid()
  }, [])

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

  /**
   * Sanitize Mermaid code to fix common AI-generated syntax issues
   */
  const sanitizeMermaidCode = (code: string): string => {
    let sanitized = code

    // Remove emojis - they cause syntax errors in node labels
    // eslint-disable-next-line no-misleading-character-class
    sanitized = sanitized.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, '')

    // ============================================================
    // FIX: Handle <br> and <br/> tags - replace with space or hyphen
    // AI often uses <br> for line breaks in labels, but Mermaid doesn't support this
    // ============================================================
    sanitized = sanitized.replace(/<br\s*\/?>/gi, ' - ')

    // Replace ampersands with "and" - & breaks Mermaid syntax
    sanitized = sanitized.replace(/&/g, 'and')

    // ============================================================
    // FIX: Handle "A & B --> C" syntax (multiple sources)
    // Mermaid doesn't support "A & B" as combined source in flowcharts
    // Split into separate lines: A --> C and B --> C
    // ============================================================
    // This is tricky - we need to handle lines like "E and F --> G"
    // After & replacement, these become "E and F --> G"
    // We'll split these into multiple arrows

    // Replace forward slashes in node labels with "or" - / can break syntax
    // Only replace within brackets [text/with/slashes] -> [text or with or slashes]
    sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, content) => {
      return '[' + content.replace(/\//g, ' or ') + ']'
    })

    // Remove or escape problematic special characters in square bracket labels [text]
    sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, content) => {
      // Remove characters that break Mermaid inside labels: # < >
      // Note: { } are valid Mermaid node shapes, so don't remove them from content
      let cleaned = content.replace(/[#]/g, '')
      // Replace < > with text equivalents
      cleaned = cleaned.replace(/</g, 'less than ')
      cleaned = cleaned.replace(/>/g, 'greater than ')
      // Replace % with "percent" - % is used for comments in Mermaid (%%)
      cleaned = cleaned.replace(/(\d+)%/g, '$1 percent')
      cleaned = cleaned.replace(/%/g, ' percent ')
      return '[' + cleaned + ']'
    })

    // Also sanitize diamond/rhombus nodes {text} - handle % in diamond nodes too
    sanitized = sanitized.replace(/\{([^}]*)\}/g, (match, content) => {
      // Check if this looks like a node label (not CSS or other syntax)
      // Diamond nodes are typically A{label} format
      if (content.includes(':') || content.includes(';')) {
        // Likely CSS or other syntax, don't modify
        return match
      }
      let cleaned = content.replace(/[#]/g, '')
      cleaned = cleaned.replace(/</g, 'less than ')
      cleaned = cleaned.replace(/>/g, 'greater than ')
      cleaned = cleaned.replace(/(\d+)%/g, '$1 percent')
      cleaned = cleaned.replace(/%/g, ' percent ')
      return '{' + cleaned + '}'
    })

    // Fix double quotes inside labels - replace with single quotes
    sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, content) => {
      return '[' + content.replace(/"/g, "'") + ']'
    })

    // Remove stray backticks that might have leaked from markdown
    sanitized = sanitized.replace(/`/g, '')

    // Fix common AI mistake: using --> with text instead of -->|text|
    // Pattern: A --> text B  should be A -->|text| B
    // But only if "text" is not a node identifier (doesn't have brackets)
    sanitized = sanitized.replace(/-->\s+([^[\s|]+)\s+(\w)/g, '-->|$1| $2')

    // Normalize whitespace - multiple spaces to single
    sanitized = sanitized.replace(/  +/g, ' ')

    // ============================================================
    // FIX: AI-generated malformed edge labels with node syntax
    // ============================================================
    // Pattern: -->|B{Traffic| Light Color?} should become --> B{Traffic Light Color?}
    // The AI incorrectly puts node definitions inside edge labels
    // This regex detects edge labels that contain { or } which indicates node syntax leaked in
    sanitized = sanitized.replace(/-->\|([^|]*[{}][^|]*)\|/g, (match, content) => {
      // The content looks like "B{Traffic" or similar - it's a malformed node definition
      // Extract and fix: turn -->|B{Traffic| into --> B{Traffic}
      // Remove the pipes and treat it as a direct connection to a node
      return '--> ' + content.replace(/\|/g, '').trim()
    })

    // Fix pattern: -->|text| followed by incomplete node like "Light Color?}"
    // This catches the second part of split malformed syntax
    sanitized = sanitized.replace(/\|\s*([^|{}\[\]]+)\s*\}\s*/g, (match, content) => {
      // This is orphaned text with a closing brace - likely part of a diamond node
      // Return as part of a node label
      return content.trim() + '} '
    })

    // Fix malformed arrows like "-->|B{" by converting to "--> B{"
    sanitized = sanitized.replace(/-->\|(\w+)\{/g, '--> $1{')

    // Fix pattern where edge label and node got merged: A -->|B{Label}| C
    // Should be: A --> B{Label} --> C  OR  A -->|Label| B --> C
    sanitized = sanitized.replace(/-->\|(\w+)\{([^}]+)\}\|/g, '--> $1{$2}')

    // Clean up any double arrows that might result from fixes
    sanitized = sanitized.replace(/-->\s*-->/g, '-->')

    // Clean up any pipes that ended up isolated
    sanitized = sanitized.replace(/\|\s*\|/g, '')
    sanitized = sanitized.replace(/-->\s*\|(\s*)\|/g, '-->')

    // ============================================================
    // END malformed edge label fixes
    // ============================================================

    // Sanitize edge labels (|text|) - handle % in edge labels too
    sanitized = sanitized.replace(/\|([^|]+)\|/g, (match, content) => {
      let cleaned = content
      // Replace % with "percent" in edge labels
      cleaned = cleaned.replace(/(\d+)%/g, '$1 percent')
      cleaned = cleaned.replace(/%/g, ' percent ')
      // Remove any { } from edge labels - these belong in nodes, not edge labels
      cleaned = cleaned.replace(/[{}]/g, '')
      return '|' + cleaned.trim() + '|'
    })

    // Fix subgraph labels with quotes - convert to plain text
    // subgraph D["Encoder Layer (x6)"] -> subgraph D[Encoder Layer x6]
    sanitized = sanitized.replace(/subgraph\s+(\w+)\["([^"]+)"\]/g, (match, id, label) => {
      // Remove parentheses content or replace with simpler text
      const cleanLabel = label.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
      return `subgraph ${id}[${cleanLabel}]`
    })

    // Also handle subgraph with just quotes (no ID)
    sanitized = sanitized.replace(/subgraph\s+"([^"]+)"/g, (match, label) => {
      const cleanLabel = label.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
      return `subgraph ${cleanLabel}`
    })

    // ============================================================
    // FIX: Handle "A and B --> C" multi-source syntax
    // Mermaid supports this with & but AI wrote "and" (we converted & to "and")
    // Convert back: "E and F --> G" becomes "E & F --> G"
    // ============================================================
    sanitized = sanitized.replace(/(\b[A-Z]\b)\s+and\s+(\b[A-Z]\b)\s*(-->|---)/gi, '$1 & $2 $3')

    // ============================================================
    // FIX: Handle parentheses in node labels - they can cause issues
    // Replace (text) with - text - inside labels
    // ============================================================
    sanitized = sanitized.replace(/\[([^\]]*)\]/g, (match, content) => {
      // Replace parentheses with dashes for readability
      let cleaned = content.replace(/\(([^)]+)\)/g, '- $1')
      return '[' + cleaned + ']'
    })

    return sanitized
  }

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
    // Declare outside try block so it's accessible in catch
    let sanitizedCode = ''
    let cleanedCode = ''

    try {
      // Ensure mermaid is initialized
      initializeMermaid()

      // Sanitize the code first to fix common AI-generated issues
      sanitizedCode = sanitizeMermaidCode(code)

      // Validate before attempting to render
      if (!isValidMermaidCode(sanitizedCode)) {
        console.warn('[Mermaid] Invalid code, skipping render:', sanitizedCode.substring(0, 100))
        setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
        return
      }

      // Clean up the code: fix multiline node labels that got split
      // Replace line breaks within brackets to keep labels on one line
      cleanedCode = sanitizedCode.trim()

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

      // Use unique ID with random suffix to avoid collisions
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}`

      console.log('[Mermaid] Attempting render:', { key, id, codeLength: cleanedCode.length })

      // Mermaid.render can throw - wrap in try-catch
      const { svg } = await mermaid.render(id, cleanedCode)

      if (svg) {
        console.log('[Mermaid] Render successful:', { key, svgLength: svg.length })
        setRenderedDiagrams(prev => new Map(prev).set(key, svg))
      } else {
        console.warn('[Mermaid] Render returned empty SVG:', { key })
        setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[Mermaid] Rendering error:', { key, error: errorMessage })

      // Log the problematic code for debugging (first 200 chars) - show sanitized version
      console.error('[Mermaid] Failed code snippet (sanitized):', cleanedCode.substring(0, 300))
      console.error('[Mermaid] Original code snippet:', code.substring(0, 200))

      setRenderedDiagrams(prev => new Map(prev).set(key, 'FAILED'))
    }
  }

  if (!content) {
    return null
  }

  return (
    <div className={`${className} overflow-wrap-anywhere w-full`}>
      {/* Mermaid diagram styling to prevent text truncation */}
      <style jsx global>{`
        .mermaid-container svg {
          max-width: none !important;
          overflow: visible !important;
        }
        .mermaid-container .node rect,
        .mermaid-container .node polygon,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse {
          stroke-width: 1px;
        }
        .mermaid-container .nodeLabel,
        .mermaid-container .label,
        .mermaid-container .node text,
        .mermaid-container text {
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: normal !important;
        }
        .mermaid-container .flowchart-link {
          stroke-width: 1px;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
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
              // If diagrams are disabled (streaming) or not yet on client, show as code block
              if (disableDiagrams || !isClient) {
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

                // Show loading state with spinner
                return (
                  <div className="my-4 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Rendering diagram...</span>
                    </div>
                  </div>
                )
              }

              // Rendering failed - show as code block with error message
              if (svg === 'FAILED') {
                return (
                  <div className="my-4">
                    <div className="text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Diagram could not be rendered</span>
                    </div>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                )
              }

              // Render the diagram with proper styling
              return (
                <div
                  className="mermaid-container my-4 w-full overflow-x-auto bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  style={{
                    // Ensure SVG text is fully visible
                    minWidth: 'fit-content',
                  }}
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
