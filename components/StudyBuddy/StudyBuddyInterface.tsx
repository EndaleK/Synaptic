"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Sparkles, Lightbulb, RotateCcw, Copy, Check, Download, Globe } from "lucide-react"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"
import { generateOpeningMessage, suggestedTopics } from "@/lib/study-buddy/personalities"
import { useToast } from "../ToastContainer"
import PersonalityToggle from "./PersonalityToggle"
import ExplainLikePresets from "./ExplainLikePresets"
import MarkdownRenderer from "../MarkdownRenderer"
import { shouldSearchWeb } from "@/lib/web-search"

export default function StudyBuddyInterface() {
  const toast = useToast()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Store state
  const {
    personalityMode,
    explainLevel,
    setPersonalityMode,
    setExplainLevel,
    getCurrentMessages,
    addMessage,
    startNewConversation,
    clearCurrentConversation
  } = useStudyBuddyStore()

  const messages = getCurrentMessages()

  // Local state
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showExplainPresets, setShowExplainPresets] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [messages, streamingMessage])

  // Initialize conversation if empty
  useEffect(() => {
    if (messages.length === 0) {
      startNewConversation()
    }
  }, [])

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()

    // Check if this message will trigger web search
    const willSearchWeb = shouldSearchWeb(userMessage)

    setInput("")
    setIsLoading(true)
    setIsSearching(willSearchWeb)
    setStreamingMessage("")

    try {
      // Add user message to conversation
      addMessage({
        role: 'user',
        content: userMessage,
        personality: personalityMode,
        explainLevel: explainLevel || undefined
      })

      // Prepare messages for API
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user' as const,
          content: userMessage
        }
      ]

      // Call Study Buddy API
      const response = await fetch('/api/study-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: conversationHistory,
          personalityMode,
          explainLevel,
          topic: userMessage // For context-aware recommendations
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ""

      if (!reader) {
        throw new Error('No response stream available')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                accumulatedResponse += data.content
                setStreamingMessage(accumulatedResponse)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add assistant message to conversation
      if (accumulatedResponse) {
        addMessage({
          role: 'assistant',
          content: accumulatedResponse,
          personality: personalityMode,
          explainLevel: explainLevel || undefined
        })
      }

      setStreamingMessage("")

    } catch (error: unknown) {
      console.error('Study Buddy chat error:', error)
      toast.error(error.message || 'Failed to get response from Study Buddy')
    } finally {
      setIsLoading(false)
      setIsSearching(false)
      inputRef.current?.focus({ preventScroll: true })
    }
  }

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle suggested topic click
  const handleTopicClick = (example: string) => {
    setInput(example)
    inputRef.current?.focus({ preventScroll: true })
  }

  // Start new conversation
  const handleNewConversation = () => {
    clearCurrentConversation()
    startNewConversation()
    setInput("")
    setStreamingMessage("")
    toast.success("Started new conversation")
  }

  // Copy message to clipboard
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success("Message copied to clipboard")

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
      toast.error("Failed to copy message")
    }
  }

  // Export conversation as markdown
  const handleExportConversation = () => {
    if (messages.length === 0) {
      toast.error("No conversation to export")
      return
    }

    try {
      // Build markdown content
      let markdown = `# Study Buddy Conversation\n\n`
      markdown += `**Personality Mode:** ${personalityMode}\n`
      if (explainLevel) {
        markdown += `**Explain Level:** ${explainLevel}\n`
      }
      markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`

      // Add messages
      messages.forEach((message) => {
        const role = message.role === 'user' ? '**You:**' : '**Study Buddy:**'
        markdown += `${role}\n\n${message.content}\n\n---\n\n`
      })

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `study-buddy-chat-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Conversation exported successfully")
    } catch (error) {
      console.error('Failed to export conversation:', error)
      toast.error("Failed to export conversation")
    }
  }

  // Get current suggested topics based on personality mode
  const currentTopics = suggestedTopics[personalityMode]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile Optimized */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            {/* Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white font-handwriting truncate">
                  Study Buddy
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-handwriting hidden sm:block">
                  Ask me anything - I'm here to help you learn
                </p>
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex items-center gap-2">
              {/* Export Button */}
              <button
                onClick={handleExportConversation}
                disabled={messages.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-handwriting min-h-[40px] sm:min-h-auto active:scale-95 flex-shrink-0"
                title="Export conversation"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* New Chat Button */}
              <button
                onClick={handleNewConversation}
                disabled={messages.length === 0}
                className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-handwriting min-h-[40px] sm:min-h-auto active:scale-95 flex-shrink-0"
                title="Start new conversation"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Controls - Mobile Optimized */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PersonalityToggle
              mode={personalityMode}
              onChange={setPersonalityMode}
            />

            {/* Explain Like Button - Mobile Optimized */}
            <div className="relative">
              <button
                onClick={() => setShowExplainPresets(!showExplainPresets)}
                className={`
                  px-3 sm:px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 min-h-[40px] active:scale-95
                  ${explainLevel
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium font-handwriting">
                  {explainLevel
                    ? `${explainLevel === 'eli5' ? 'ELI5' : explainLevel.replace('-', ' ')}`
                    : 'Explain...'}
                </span>
              </button>

              {/* Explain Presets Dropdown */}
              {showExplainPresets && (
                <div className="absolute top-full left-0 mt-2 z-10">
                  <ExplainLikePresets
                    currentLevel={explainLevel}
                    onSelect={(level) => {
                      setExplainLevel(level)
                      setShowExplainPresets(false)
                    }}
                    onClose={() => setShowExplainPresets(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full">
          {/* Welcome Message */}
          {messages.length === 0 && !streamingMessage && (
            <div className="space-y-6">
              {/* Opening message */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-gray-700 dark:text-gray-300 font-handwriting text-[15px] leading-relaxed">
                  {generateOpeningMessage(personalityMode)}
                </p>
              </div>

              {/* Suggested topics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 font-handwriting">
                  Try asking about:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentTopics.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTopicClick(topic.example)}
                      className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group"
                    >
                      <span className="text-2xl flex-shrink-0">{topic.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 font-handwriting">
                          {topic.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-handwriting">
                          {topic.example}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div className="max-w-3xl w-full overflow-hidden">
                <div
                  className={`
                    rounded-lg p-4 break-words
                    ${message.role === 'user'
                      ? 'bg-gray-700 dark:bg-gray-600 text-white ml-8'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  {message.role === 'user' ? (
                    <div className="font-handwriting text-[15px] leading-relaxed break-words">
                      {message.content}
                    </div>
                  ) : (
                    <MarkdownRenderer
                      content={message.content}
                      className="font-handwriting text-[15px] leading-relaxed text-gray-900 dark:text-gray-100"
                    />
                  )}
                </div>

                {/* Copy button for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="flex justify-end mt-2 mr-2">
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all active:scale-95 min-h-[36px]"
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="mb-4">
              <div className="max-w-3xl overflow-hidden break-words bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-gray-100">
                <MarkdownRenderer
                  content={streamingMessage}
                  className="font-handwriting text-[15px] leading-relaxed text-gray-900 dark:text-gray-100"
                  disableDiagrams={true}
                />
                <span className="inline-block w-1 h-4 bg-gray-400 ml-1 animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingMessage && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              {isSearching ? (
                <>
                  <Globe className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-handwriting">🔍 Searching the web...</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-handwriting">Thinking...</span>
                </>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Mobile Optimized */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-handwriting text-sm sm:text-[15px]"
                style={{
                  minHeight: '48px',
                  maxHeight: '200px'
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 font-medium font-handwriting shadow-md hover:shadow-lg min-h-[48px] active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 text-center font-handwriting">
            Powered by AI • Press Enter to send{' '}
            <span className="hidden sm:inline">, Shift+Enter for new line</span>
          </p>
        </div>
      </div>
    </div>
  )
}
