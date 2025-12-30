"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, MessageCircle, X, History, Copy, Check, Bot, Maximize2, Minimize2, PanelRightClose } from "lucide-react"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"
import { useDocumentStore, useUIStore } from "@/lib/store/useStore"
import { useToast } from "./ToastContainer"
import { cn } from "@/lib/utils"
import MarkdownRenderer from "./MarkdownRenderer"
import { ActionSuggestionList } from "./teacher/ActionSuggestionCard"
import type { SuggestedAction } from "@/lib/teacher-agent/types"
import type { PreferredMode } from "@/lib/supabase/types"
import { getGreetingMessage, type MotivationMessage } from "@/lib/motivation-messages"
import { StudyBuddyGreeting } from "./BuddyMessage"
import { useUser } from "@clerk/nextjs"

export default function FloatingStudyBuddy() {
  const toast = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useUser()

  // Keep existing Study Buddy store for conversation management
  const {
    getCurrentMessages,
    addMessage,
    startNewConversation,
    conversationHistory,
    loadConversation,
    currentConversation,
    // View mode
    viewMode,
    setViewMode,
    panelWidth,
    // Agentic Teacher state (always enabled)
    pendingActions,
    executingActionId,
    addPendingActions,
    approveAction,
    rejectAction,
    updateActionStatus,
    setExecutingAction,
    clearPendingActions,
    // Activity tracking
    updateLastActivity
  } = useStudyBuddyStore()

  const { currentDocument } = useDocumentStore()
  const { activeMode, setActiveMode } = useUIStore()

  const messages = getCurrentMessages()

  // UI state
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [greetingMessage, setGreetingMessage] = useState<MotivationMessage | null>(null)

  // Derived state from viewMode
  const isMinimized = viewMode === 'minimized'
  const isPanel = viewMode === 'panel'

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

  // Generate greeting message when Study Buddy opens
  useEffect(() => {
    if (!isMinimized && messages.length === 0) {
      setGreetingMessage(getGreetingMessage())
    }
  }, [isMinimized, messages.length])

  // Don't show when user is in Chat mode (Chat has its own interface)
  if (activeMode === 'chat') {
    return null
  }

  // Available slash commands for help display
  const SLASH_COMMANDS = [
    { cmd: '/clear', desc: 'Clear chat history' },
    { cmd: '/new', desc: 'Start a new conversation' },
    { cmd: '/help', desc: 'Show available commands' },
    { cmd: '/explain [topic]', desc: 'Get detailed explanation' },
    { cmd: '/summarize', desc: 'Summarize document or discussion' },
    { cmd: '/quiz', desc: 'Create quiz questions' },
    { cmd: '/eli5 [topic]', desc: 'Explain like I\'m 5' },
    { cmd: '/example [concept]', desc: 'Get real-world examples' },
    { cmd: '/flashcards', desc: 'Go to Flashcards mode' },
    { cmd: '/mindmap', desc: 'Go to Mind Map mode' },
    { cmd: '/podcast', desc: 'Go to Podcast mode' },
    { cmd: '/home', desc: 'Go to Dashboard home' },
  ]

  // Parse quick commands - returns action type for special commands
  const parseQuickCommand = (text: string): { command: string | null; actualMessage: string; action?: 'clear' | 'new' | 'help' | 'navigate' | 'message'; navigateTo?: PreferredMode } => {
    const commandMatch = text.match(/^\/(\w+)\s*(.*)/)
    if (commandMatch) {
      const [, command, rest] = commandMatch
      let actualMessage = rest.trim()
      const cmd = command.toLowerCase()

      // Special commands that don't send a message
      switch (cmd) {
        case 'clear':
          return { command: cmd, actualMessage: '', action: 'clear' }
        case 'new':
          return { command: cmd, actualMessage: '', action: 'new' }
        case 'help':
        case 'commands':
          return { command: cmd, actualMessage: '', action: 'help' }
        case 'flashcards':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'flashcards' }
        case 'mindmap':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'mindmap' }
        case 'podcast':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'podcast' }
        case 'home':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'home' }
        case 'chat':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'chat' }
        case 'writer':
        case 'write':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'writer' }
        case 'video':
          return { command: cmd, actualMessage: '', action: 'navigate', navigateTo: 'video' }
      }

      // Commands that transform into messages
      switch (cmd) {
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
        case 'define':
          actualMessage = `What is the definition of ${actualMessage || 'this term'}?`
          break
        case 'compare':
          actualMessage = `Can you compare and contrast ${actualMessage || 'these concepts'}?`
          break
        case 'steps':
          actualMessage = `Can you break down ${actualMessage || 'this process'} into step-by-step instructions?`
          break
        default:
          return { command: null, actualMessage: text, action: 'message' }
      }

      return { command: cmd, actualMessage, action: 'message' }
    }
    return { command: null, actualMessage: text, action: 'message' }
  }

  // Show help message with available commands
  const showHelpMessage = () => {
    const helpContent = SLASH_COMMANDS.map(c => `**${c.cmd}** - ${c.desc}`).join('\n')
    addMessage({
      role: 'assistant',
      content: `## Available Commands\n\n${helpContent}\n\n*Tip: Type any command to use it!*`
    })
  }

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    const { command, actualMessage, action, navigateTo } = parseQuickCommand(userInput)

    setInput("")

    // Handle special commands that don't require API call
    if (action === 'clear') {
      startNewConversation()
      clearPendingActions()
      toast.success('Chat cleared')
      return
    }

    if (action === 'new') {
      startNewConversation()
      clearPendingActions()
      setGreetingMessage(getGreetingMessage())
      toast.success('Started new conversation')
      return
    }

    if (action === 'help') {
      showHelpMessage()
      return
    }

    if (action === 'navigate' && navigateTo) {
      setActiveMode(navigateTo)
      toast.success(`Switched to ${navigateTo} mode`)
      return
    }

    // For message commands, proceed with API call
    setIsLoading(true)
    setStreamingMessage("")

    if (command && action === 'message') {
      toast.success(`/${command}`)
    }

    try {
      // Add user message to conversation
      addMessage({
        role: 'user',
        content: actualMessage
      })

      // Prepare messages for API
      const conversationHistoryForApi = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user' as const,
          content: actualMessage
        }
      ]

      // Update last activity timestamp
      updateLastActivity()

      // Always use Teacher Agent API (unified experience)
      const response = await fetch('/api/teacher-agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: actualMessage,
          conversationId: currentConversation?.id,
          conversationHistory: conversationHistoryForApi
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get response')
      }

      const data = await response.json()

      // Add assistant message with suggested actions
      if (data.message) {
        addMessage({
          role: 'assistant',
          content: data.message,
          suggestedActions: data.suggestedActions
        })
      }

      // Add suggested actions to store
      if (data.suggestedActions && data.suggestedActions.length > 0) {
        addPendingActions(data.suggestedActions)
      }
    } catch (error: unknown) {
      console.error('Study Buddy chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response from Study Buddy'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Handle approving an action
  const handleApproveAction = async (actionId: string) => {
    approveAction(actionId)

    try {
      // Execute the action
      const response = await fetch('/api/teacher-agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionId })
      })

      const result = await response.json()

      if (result.success) {
        updateActionStatus(actionId, 'completed')
        toast.success(result.message || 'Action completed!')

        // Handle navigation actions
        if (result.data?.action === 'navigate' && result.data?.mode) {
          // Map teacher agent modes to app modes
          const modeMap: Record<string, PreferredMode> = {
            'home': 'home',
            'chat': 'chat',
            'flashcards': 'flashcards',
            'podcast': 'podcast',
            'mindmap': 'mindmap',
            'quiz': 'flashcards', // Quiz uses flashcards mode
            'quick-summary': 'podcast', // Quick summary uses podcast mode
            'study-guide': 'studyguide',
            'writer': 'writer',
            'video': 'video'
          }
          const targetMode = modeMap[result.data.mode as string] || 'home'
          setActiveMode(targetMode)
        }
      } else {
        updateActionStatus(actionId, 'failed')
        toast.error(result.error || 'Action failed')
      }
    } catch (error) {
      console.error('Action execution error:', error)
      updateActionStatus(actionId, 'failed')
      toast.error('Failed to execute action')
    } finally {
      setExecutingAction(null)
    }
  }

  // Handle rejecting an action
  const handleRejectAction = async (actionId: string) => {
    rejectAction(actionId)
    toast.info('Action dismissed')

    // Update in database
    try {
      await fetch('/api/teacher-agent/execute', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actionId, status: 'rejected' })
      })
    } catch (error) {
      console.error('Failed to update action status:', error)
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
          onClick={() => setViewMode('minimized')}
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
                  onClick={() => setViewMode('minimized')}
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
              <div className="text-center py-6">
                {greetingMessage ? (
                  <StudyBuddyGreeting
                    message={greetingMessage}
                    userName={user?.firstName || undefined}
                  />
                ) : (
                  <>
                    <Bot className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Hey! I'm your Study Buddy. Tell me what you want to learn!
                    </p>
                  </>
                )}
                {quickActions.length > 0 && (
                  <div className="space-y-2 mt-4">
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
            onClick={() => setViewMode('floating')}
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

  // Desktop expanded state - Opens above the circular button OR as panel
  const containerClass = isPanel
    ? "fixed top-0 right-0 z-50 h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300"
    : "fixed z-50 w-[400px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"

  return (
    <div
      className={containerClass}
      style={isPanel
        ? { width: `${panelWidth}%` }
        : { bottom: '7rem', right: '1rem', maxHeight: 'calc(100vh - 10rem)' }
      }
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">Study Buddy</h3>
              {currentDocument && (
                <p className="text-xs text-purple-100 truncate max-w-[200px]">
                  {currentDocument.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand/Collapse Panel */}
            <button
              onClick={() => setViewMode(isPanel ? 'floating' : 'panel')}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title={isPanel ? 'Collapse to floating' : 'Expand to panel'}
            >
              {isPanel ? <PanelRightClose className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
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
              onClick={() => setViewMode('minimized')}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Minimize"
            >
              {isPanel ? <Minimize2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
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
      <div className={cn(
        "flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 min-h-0",
        isPanel && "p-4"
      )}>
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center py-6 flex flex-col items-center justify-center h-full">
            {greetingMessage ? (
              <StudyBuddyGreeting
                message={greetingMessage}
                userName={user?.firstName || undefined}
                className={isPanel ? "py-8" : ""}
              />
            ) : (
              <>
                <Bot className={cn("text-purple-500 mx-auto mb-2", isPanel ? "w-12 h-12" : "w-10 h-10")} />
                <p className={cn("text-gray-600 dark:text-gray-400 mb-3", isPanel ? "text-base" : "text-sm")}>
                  Hey! I'm your Study Buddy. What would you like to learn today?
                </p>
              </>
            )}
            <div className="space-y-1.5 mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Try saying:</p>
              {[
                'Help me study my documents',
                'What should I review today?',
                'Create flashcards from my notes',
                'Quiz me on what I learned'
              ].slice(0, isPanel ? 4 : 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className={cn(
                    "block w-full text-left px-2 py-1.5 bg-white dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                    isPanel ? "text-sm py-2" : "text-xs"
                  )}
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
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
          <div className={cn(
            "flex items-center gap-1.5 text-gray-500 dark:text-gray-400",
            isPanel ? "text-sm" : "text-xs"
          )}>
            <Loader2 className={cn("animate-spin", isPanel ? "w-4 h-4" : "w-3 h-3")} />
            <span>Thinking...</span>
          </div>
        )}

        {/* Pending Actions from Agentic Teacher */}
        {pendingActions.length > 0 && (
          <ActionSuggestionList
            actions={pendingActions}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
            executingActionId={executingActionId}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={cn(
        "flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
        isPanel ? "p-4" : "p-3"
      )}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400",
              isPanel ? "px-3 py-2 text-sm" : "px-2 py-1.5 text-xs"
            )}
            style={{ minHeight: isPanel ? '40px' : '32px', maxHeight: isPanel ? '150px' : '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed",
              isPanel ? "p-3" : "p-2"
            )}
          >
            {isLoading ? (
              <Loader2 className={cn("animate-spin", isPanel ? "w-5 h-5" : "w-4 h-4")} />
            ) : (
              <Send className={isPanel ? "w-5 h-5" : "w-4 h-4"} />
            )}
          </button>
        </div>
        <p className={cn(
          "text-gray-500 dark:text-gray-400 mt-1.5 text-center",
          isPanel ? "text-xs" : "text-[10px]"
        )}>
          Ask for help • I can suggest study actions for you
        </p>
      </div>
    </div>
  )
}
