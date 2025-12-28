"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, MessageCircle, X, History, Copy, Check } from "lucide-react"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"
import { useDocumentStore, useUIStore } from "@/lib/store/useStore"
import { useToast } from "./ToastContainer"
import { cn } from "@/lib/utils"
import MarkdownRenderer from "./MarkdownRenderer"

export default function FloatingStudyBuddy() {
  const toast = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep existing Study Buddy store for conversation management
  const {
    getCurrentMessages,
    addMessage,
    startNewConversation,
    conversationHistory,
    loadConversation,
    currentConversation
  } = useStudyBuddyStore()

  const { currentDocument } = useDocumentStore()
  const { activeMode } = useUIStore()

  const messages = getCurrentMessages()

  // UI state
  const [isMinimized, setIsMinimized] = useState(true)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, streamingMessage, isMinimized])

  // Initialize conversation if empty
  useEffect(() => {
    if (messages.length === 0 && !isMinimized) {
      startNewConversation()
    }
  }, [isMinimized])

  // Don't show when user is in Chat mode (Chat has its own interface)
  if (activeMode === 'chat') {
    return null
  }

  // Parse quick commands
  const parseQuickCommand = (text: string): { command: string | null; actualMessage: string } => {
    const commandMatch = text.match(/^\/(\w+)\s*(.*)/)
    if (commandMatch) {
      const [, command, rest] = commandMatch
      let actualMessage = rest.trim()

      switch (command.toLowerCase()) {
        case 'explain':
          actualMessage = `Please explain ${actualMessage || 'this topic'} in detail.`
          break
        case 'summarize':
          actualMessage = actualMessage || (currentDocument
            ? `Please summarize the key points from ${currentDocument.name}.`
            : 'Please summarize the main concepts we\'ve discussed.')
          break
        case 'quiz':
          actualMessage = actualMessage || 'Can you create quiz questions to test my understanding?'
          break
        case 'eli5':
          actualMessage = `Explain ${actualMessage || 'this'} like I'm 5 years old.`
          break
        case 'example':
          actualMessage = `Can you give me a real-world example of ${actualMessage || 'this concept'}?`
          break
        default:
          return { command: null, actualMessage: text }
      }

      return { command: command.toLowerCase(), actualMessage }
    }
    return { command: null, actualMessage: text }
  }

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    const { command, actualMessage } = parseQuickCommand(userInput)

    setInput("")
    setIsLoading(true)
    setStreamingMessage("")

    if (command) {
      toast.success(`Quick command: /${command}`)
    }

    try {
      // Add user message to conversation
      addMessage({
        role: 'user',
        content: actualMessage
      })

      // Prepare messages for API
      const conversationHistory = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user' as const,
          content: actualMessage
        }
      ]

      // Build context-aware prompt
      let contextInfo = ""
      if (currentDocument) {
        contextInfo = `\n\n[Context: User is studying "${currentDocument.name}" in ${activeMode} mode]`
      }

      // Call Study Buddy API
      const response = await fetch('/api/study-buddy/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: conversationHistory,
          topic: actualMessage + contextInfo,
          documentId: currentDocument?.id,
          activeMode
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
          content: accumulatedResponse
        })
      }

      setStreamingMessage("")

    } catch (error: unknown) {
      console.error('Study Buddy chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response from Study Buddy'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Handle Enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Copy message to clipboard
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success("Message copied!")

      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
      toast.error("Failed to copy message")
    }
  }

  // Get mode-specific quick actions
  const getQuickActions = () => {
    const actions = []

    if (currentDocument) {
      actions.push({ label: "Summarize document", command: "/summarize" })
      actions.push({ label: "Explain key concepts", command: "/explain key concepts" })
    }

    switch (activeMode) {
      case 'flashcards':
        actions.push({ label: "Quiz me", command: "/quiz" })
        break
      case 'podcast':
        actions.push({ label: "Explain this section", command: "/explain this section" })
        break
      case 'mindmap':
        actions.push({ label: "Expand concept", command: "/explain" })
        break
    }

    return actions
  }

  const quickActions = getQuickActions()

  // Mobile full-screen modal variant
  if (isMobile && !isMinimized) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setIsMinimized(true)}
        />

        {/* Full-screen modal */}
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      Study Buddy
                    </h2>
                    {currentDocument && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {currentDocument.name}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && !streamingMessage && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Hi! I'm your Study Buddy. Ask me anything!
                </p>
                {quickActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Quick actions:</p>
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(action.command)}
                        className="block w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 ${message.role === 'user' ? 'flex justify-end' : ''}`}
              >
                <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={cn(
                      "rounded-lg p-3",
                      message.role === 'user'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {message.role === 'user' ? (
                      <div className="text-sm">{message.content}</div>
                    ) : (
                      <MarkdownRenderer
                        content={message.content}
                        className="text-sm text-gray-900 dark:text-gray-100"
                      />
                    )}
                  </div>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {streamingMessage && (
              <div className="mb-3">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <MarkdownRenderer
                    content={streamingMessage}
                    className="text-sm text-gray-900 dark:text-gray-100"
                    disableDiagrams={true}
                  />
                  <span className="inline-block w-1 h-3 bg-purple-500 ml-1 animate-pulse" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)]">
            <div className="px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2 min-h-[40px]"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Try: /explain, /summarize, /quiz, /eli5
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop minimized state - Circular icon
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50" data-tour="study-buddy">
        <div className="relative group">
          {/* Main button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            title="Open Study Buddy"
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6" />
              {mounted && messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Desktop expanded state - Opens above the circular button
  return (
    <div className="fixed bottom-28 right-4 z-50 w-[400px] max-h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">Study Buddy</h3>
              {currentDocument && (
                <p className="text-xs text-purple-100 truncate max-w-[250px]">
                  {currentDocument.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {conversationHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Conversation history"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation History Dropdown */}
      {showHistory && (
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 max-h-[200px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Recent Conversations</h4>
            <button
              onClick={() => {
                startNewConversation()
                setShowHistory(false)
                toast.success("Started new conversation")
              }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
            >
              + New
            </button>
          </div>
          <div className="space-y-1">
            {conversationHistory.slice(0, 5).map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  loadConversation(conv.id)
                  setShowHistory(false)
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
                  currentConversation?.id === conv.id ? "bg-purple-100 dark:bg-purple-900/20" : ""
                )}
              >
                <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {conv.title || 'New conversation'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">
                  {conv.messages.length} messages
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center py-6">
            <MessageCircle className="w-10 h-10 text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Hi! Ask me anything about your studies.
            </p>
            {quickActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Quick actions:</p>
                {quickActions.slice(0, 3).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(action.command)}
                    className="block w-full text-left px-2 py-1.5 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-2 ${message.role === 'user' ? 'flex justify-end' : ''}`}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'w-full'}`}>
              <div
                className={cn(
                  "rounded-lg p-2.5 text-xs",
                  message.role === 'user'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                )}
              >
                {message.role === 'user' ? (
                  <div>{message.content}</div>
                ) : (
                  <MarkdownRenderer
                    content={message.content}
                    className="text-xs text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>
              {message.role === 'assistant' && (
                <button
                  onClick={() => handleCopyMessage(message.id, message.content)}
                  className="mt-0.5 text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-0.5"
                >
                  {copiedMessageId === message.id ? (
                    <>
                      <Check className="w-2.5 h-2.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {streamingMessage && (
          <div className="mb-2">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
              <MarkdownRenderer
                content={streamingMessage}
                className="text-xs text-gray-900 dark:text-gray-100"
                disableDiagrams={true}
              />
              <span className="inline-block w-0.5 h-3 bg-purple-500 ml-1 animate-pulse" />
            </div>
          </div>
        )}

        {isLoading && !streamingMessage && (
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-xs"
            style={{ minHeight: '32px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">
          Try: /explain, /summarize, /quiz • Enter to send
        </p>
      </div>
    </div>
  )
}
