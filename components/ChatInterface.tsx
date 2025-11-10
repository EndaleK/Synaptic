"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, FileText, Bot, User, Loader2, Upload, X, Lightbulb, Info, MessageSquare, Sparkles, Brain, ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { useDocumentStore } from "@/lib/store/useStore"
import DocumentSwitcherModal from "./DocumentSwitcherModal"
import SectionNavigator from "./SectionNavigator"
import type { DocumentSection } from "@/lib/document-parser/section-detector"

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF Viewer...</p>
      </div>
    </div>
  )
})

interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: Date
}

interface ChatDocument {
  file: File | null
  content: string
  isProcessing: boolean
}

type TeachingMode = 'socratic' | 'direct' | 'mixed'

const teachingModes = [
  {
    value: 'socratic' as TeachingMode,
    label: 'Socratic',
    icon: Lightbulb,
    description: 'Discover answers through guided questions',
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    value: 'direct' as TeachingMode,
    label: 'Direct',
    icon: MessageSquare,
    description: 'Get clear, straightforward answers',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    value: 'mixed' as TeachingMode,
    label: 'Mixed',
    icon: Brain,
    description: 'Balance between guidance and direct answers',
    color: 'text-accent-primary'
  }
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatDocument, setChatDocument] = useState<ChatDocument>({
    file: null,
    content: "",
    isProcessing: false
  })
  const [isClient, setIsClient] = useState(false)
  const [teachingMode, setTeachingMode] = useState<TeachingMode>('mixed')
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const { currentDocument, setCurrentDocument} = useDocumentStore()
  const hasLoadedDocument = useRef(false)

  useEffect(() => {
    setIsClient(true)
    // Load teaching mode from localStorage
    const savedMode = localStorage.getItem('teachingMode') as TeachingMode | null
    if (savedMode && ['socratic', 'direct', 'mixed'].includes(savedMode)) {
      setTeachingMode(savedMode)
    }
  }, [])

  // Save teaching mode to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('teachingMode', teachingMode)
    }
  }, [teachingMode, isClient])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false)
      }
    }

    if (showModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModeDropdown])

  // Keyboard shortcut: Cmd/Ctrl+K to clear chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (messages.length > 0) {
          setMessages([])
          setInputMessage("")
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [messages.length])

  // Load document from store if available
  useEffect(() => {
    const loadDocument = async () => {
      if (currentDocument && !hasLoadedDocument.current && !chatDocument.file) {
        hasLoadedDocument.current = true

        try {
          let file: File

          // For PDFs, fetch the original file from storage if available
          if (currentDocument.fileType === 'application/pdf') {
            console.log('🔍 PDF Document Info:', {
              id: currentDocument.id,
              name: currentDocument.name,
              storagePath: currentDocument.storagePath,
              storagePathType: typeof currentDocument.storagePath,
              storagePathLength: currentDocument.storagePath?.length,
              hasStoragePath: !!currentDocument.storagePath,
            })

            if (!currentDocument.storagePath || currentDocument.storagePath.trim() === '') {
              console.error('⚠️ PDF document has no storagePath!', {
                storagePath: currentDocument.storagePath,
                document: currentDocument
              })
              throw new Error('PDF storage path not available - document may not have finished uploading')
            }

            setChatDocument({
              file: null,
              content: currentDocument.content,
              isProcessing: true
            })

            console.log('📥 Fetching PDF download URL for document:', currentDocument.id)

            // Step 1: Get signed download URL from server
            const urlResponse = await fetch(`/api/documents/${currentDocument.id}/download-url`)

            if (!urlResponse.ok) {
              const errorData = await urlResponse.json().catch(() => ({ error: 'Failed to get download URL' }))
              console.error('❌ Failed to get download URL:', errorData)
              throw new Error(errorData.error || 'Failed to get download URL')
            }

            const { downloadUrl } = await urlResponse.json()
            console.log('✅ Download URL received, fetching PDF directly from Supabase...')

            // Step 2: Fetch PDF directly from Supabase using signed URL
            const response = await fetch(downloadUrl)

            if (!response.ok) {
              console.error('❌ PDF fetch failed:', {
                status: response.status,
                statusText: response.statusText
              })
              throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
            }

            const blob = await response.blob()
            console.log('✅ PDF fetched successfully from Supabase, size:', blob.size)
            file = new File([blob], currentDocument.name, { type: 'application/pdf' })
          } else {
            // For other file types, create a file from the content
            const blob = new Blob([currentDocument.content], { type: currentDocument.fileType || 'text/plain' })
            file = new File([blob], currentDocument.name, { type: currentDocument.fileType || 'text/plain' })
          }

          setChatDocument({
            file,
            content: currentDocument.content,
            isProcessing: false
          })

          // Set initial welcome message
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            content: `📄 Document loaded: ${currentDocument.name}. Ask me anything about this document!`,
            type: "assistant",
            timestamp: new Date()
          }
          setMessages([welcomeMessage])
        } catch (error) {
          console.error('Error loading document:', error)

          // Fallback to text-only display
          const textBlob = new Blob([currentDocument.content], { type: 'text/plain' })
          const textFile = new File([textBlob], currentDocument.name, { type: 'text/plain' })

          setChatDocument({
            file: textFile,
            content: currentDocument.content,
            isProcessing: false
          })

          // Create detailed error message based on error type
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          let userMessage = `⚠️ Could not load original PDF viewer. `

          if (errorMsg.includes('storage path') || errorMsg.includes('storagePath')) {
            userMessage += `This document is missing its storage reference. The extracted text is available below for Q&A. To view the full PDF, please re-upload the document.`
          } else if (errorMsg.includes('403') || errorMsg.includes('401')) {
            userMessage += `Access denied to PDF storage. The extracted text is available below. Please re-upload the document or contact support if this persists.`
          } else if (errorMsg.includes('404')) {
            userMessage += `PDF file not found in storage. The extracted text is available below. Please re-upload the document.`
          } else {
            userMessage += `Showing extracted text instead. You can still ask questions about the document!`
          }

          const errorMessage: Message = {
            id: Date.now().toString(),
            content: userMessage,
            type: "assistant",
            timestamp: new Date()
          }
          setMessages([errorMessage])
        }
      }
    }

    loadDocument()
  }, [currentDocument, chatDocument.file])

  const generateId = useCallback(() => {
    if (!isClient) return 'temp-id'
    return Date.now().toString()
  }, [isClient])

  const generateTimestamp = useCallback(() => {
    if (!isClient) return new Date(0)
    return new Date()
  }, [isClient])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (chatDocument.file && messages.length === 0) {
      const fileMessage: Message = {
        id: generateId(),
        content: `📄 Document loaded: ${chatDocument.file.name}. Ask me anything about this document!`,
        type: "assistant",
        timestamp: generateTimestamp()
      }
      setMessages([fileMessage])
    }
  }, [chatDocument.file, messages.length, generateId, generateTimestamp])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setChatDocument({
        file: selectedFile,
        content: "",
        isProcessing: true
      })
      extractDocumentContent(selectedFile)
    }
  }

  const triggerChatFileInput = () => {
    const fileInput = document.getElementById('chat-file-input') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setChatDocument({
        file: droppedFile,
        content: "",
        isProcessing: true
      })
      extractDocumentContent(droppedFile)
    }
  }

  const extractDocumentContent = async (file: File) => {
    try {
      // Save document to Supabase
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save document")
      }

      const data = await response.json()
      const extractedText = data.document.extracted_text || ""

      console.log("Document saved to Supabase:", data.document)

      setChatDocument(prev => ({
        ...prev,
        content: extractedText,
        isProcessing: false
      }))

      // Update global document store with the saved document ID
      setCurrentDocument({
        id: data.document.id,
        name: file.name,
        content: extractedText,
        fileType: file.type,
        storagePath: data.document.storage_path
      })

      setMessages([])
    } catch (error) {
      console.error("Error extracting document content:", error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'

      setChatDocument(prev => ({
        ...prev,
        content: "",
        isProcessing: false
      }))

      const errorMessage: Message = {
        id: generateId(),
        content: `I encountered an issue processing "${file.name}": ${errorMsg}\n\nPlease try uploading a different file or format.`,
        type: "assistant",
        timestamp: generateTimestamp()
      }
      setMessages([errorMessage])
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setInputMessage("")
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // Check for /clear command
    if (inputMessage.trim() === '/clear') {
      handleClearChat()
      return
    }

    if (!chatDocument.file) {
      alert("Please upload a document first to start chatting.")
      return
    }

    const userMessage: Message = {
      id: generateId(),
      content: inputMessage,
      type: "user",
      timestamp: generateTimestamp()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      // Check if document is RAG-indexed (for large documents)
      const isRAGIndexed = currentDocument?.metadata?.rag_indexed === true
      const isLargeDocument = currentDocument && currentDocument.fileSize && currentDocument.fileSize > 10 * 1024 * 1024

      // For non-RAG documents, validate content
      if (!isRAGIndexed) {
        if (!chatDocument.content || chatDocument.content.trim().length === 0) {
          // Check if this is a large document that needs RAG indexing
          if (isLargeDocument) {
            throw new Error("LARGE_DOCUMENT_REQUIRES_RAG")
          }
          throw new Error("NO_DOCUMENT_CONTENT")
        }
      }

      // Determine which endpoint to use
      const endpoint = isRAGIndexed ? "/api/chat-rag" : "/api/chat-with-document"

      console.log('[ChatInterface] Sending chat request:', {
        endpoint,
        isRAGIndexed,
        messageLength: inputMessage.length,
        contentLength: chatDocument.content?.length || 0,
        fileName: chatDocument.file?.name,
        teachingMode,
        documentId: currentDocument?.id
      })

      const requestBody = isRAGIndexed
        ? {
            message: inputMessage,
            documentId: currentDocument?.id,
            teachingMode: teachingMode,
          }
        : {
            message: inputMessage,
            fileName: chatDocument.file?.name,
            documentContent: chatDocument.content,
            teachingMode: teachingMode,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log('[ChatInterface] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ChatInterface] API error response:', errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('[ChatInterface] Received response:', data)

      const assistantMessage: Message = {
        id: generateId() + '-response',
        content: data.response || "I apologize, but I'm having trouble processing your request.",
        type: "assistant",
        timestamp: generateTimestamp()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("[ChatInterface] Chat error:", error)

      let errorContent = "I apologize, but I'm having trouble processing your request. "

      if (error instanceof Error) {
        if (error.message === "LARGE_DOCUMENT_REQUIRES_RAG") {
          errorContent = "📚 This document is large (>10MB) and requires RAG indexing to use chat features.\n\n" +
            "**What's RAG?** Retrieval-Augmented Generation allows me to search through your document and find relevant sections to answer your questions.\n\n" +
            "**Next Steps:**\n" +
            "1. Go back to the Documents page\n" +
            "2. Click the 'Index Document' button next to your document\n" +
            "3. Wait 1-2 minutes for indexing to complete\n" +
            "4. Return here to start chatting!\n\n" +
            "**Requirements:** Make sure ChromaDB is running (see deployment guide for setup instructions)."
        } else if (error.message === "NO_DOCUMENT_CONTENT") {
          errorContent = "No document content found. Please try re-uploading your document."
        } else if (error.message.includes('401')) {
          errorContent = "Authentication error. Please try signing out and back in."
        } else if (error.message.includes('429')) {
          errorContent = "Too many requests. Please wait a moment and try again."
        } else if (error.message.includes('500')) {
          errorContent = "Server error. Our team has been notified. Please try again in a few moments."
        } else {
          errorContent += `Error details: ${error.message}`
        }
      }

      const errorMessage: Message = {
        id: generateId() + '-error',
        content: errorContent,
        type: "assistant",
        timestamp: generateTimestamp()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleReset = () => {
    const confirmed = window.confirm("Clear the chat and remove the document?")
    if (confirmed) {
      setChatDocument({ file: null, content: "", isProcessing: false })
      setMessages([])
      setInputMessage("")
      setIsLoading(false)
      setCurrentDocument(null)
      hasLoadedDocument.current = false
    }
  }

  const isPDFFile = chatDocument.file?.type === "application/pdf"

  return (
    <div className="h-full flex bg-white dark:bg-black border-gray-300 dark:border-gray-700 overflow-hidden">
      {/* Two Column Layout: PDF Viewer | Chat (50/50 split) */}
        {!chatDocument.file ? (
          /* Upload Area - Full Width with Header */
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-8">
              {/* Header Section */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden mb-6">
                <div className="p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                        Chat with Your Document
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Upload any document and engage with an intelligent teaching assistant that guides you through Socratic dialogue
                      </p>

                      {/* Feature Badges */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                          <Brain className="w-3.5 h-3.5 text-accent-primary" />
                          Socratic Teaching
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                          <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                          Synaptic Learning
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                          <FileText className="w-3.5 h-3.5 text-accent-primary" />
                          Multi-Format Support
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teaching Mode Selector */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-black dark:text-white mb-3">
                  How would you like to learn?
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {teachingModes.map((mode) => {
                    const Icon = mode.icon
                    const isSelected = teachingMode === mode.value
                    return (
                      <button
                        key={mode.value}
                        onClick={() => setTeachingMode(mode.value)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "border-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-accent-primary/50 dark:hover:border-accent-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn("w-5 h-5", isSelected ? "text-accent-primary" : "text-gray-600 dark:text-gray-400")} />
                          <span className="font-semibold text-sm text-black dark:text-white">
                            {mode.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {mode.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={triggerChatFileInput}
                className="border-2 border-dashed border-accent-primary/30 dark:border-accent-primary/50 rounded-2xl hover:border-accent-primary dark:hover:border-accent-primary hover:bg-accent-primary/5 dark:hover:bg-accent-primary/10 transition-all duration-300 group cursor-pointer bg-accent-primary/5 dark:bg-accent-primary/10 p-12"
              >
                <div className="text-center max-w-md mx-auto">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg mb-6">
                    <Upload className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                    Upload a document to start chatting
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    Drag and drop your file here, or click to browse
                  </p>

                  <button
                    onClick={triggerChatFileInput}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto mb-4"
                  >
                    <Upload className="h-5 w-5" />
                    Choose File
                  </button>

                  <input
                    id="chat-file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.doc,.docx,.json"
                  />

                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Supported formats: PDF, TXT, DOC, DOCX, JSON
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : chatDocument.isProcessing ? (
          /* Loading State */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Processing document...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Analyzing your document. This may take a moment...
              </p>
            </div>
          </div>
        ) : (
          /* Two Column Layout: Document Viewer | Chat (50/50) */
          <>
            {/* Document Viewer Column - 50% width */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {isPDFFile ? (
                <PDFViewer file={chatDocument.file} className="h-full" />
              ) : (
                <div className="h-full overflow-auto p-6">
                  <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <FileText className="w-6 h-6 text-gray-500 flex-shrink-0" />
                        <h2 className="text-lg font-semibold text-black dark:text-white truncate">
                          {chatDocument.file?.name}
                        </h2>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                          {chatDocument.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Column - 50% width */}
            <div className="w-1/2 flex flex-col">
              {/* Document Header */}
              <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {chatDocument.file?.name}
                    </span>
                  </div>

                  {/* Teaching Mode Dropdown */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative" ref={modeDropdownRef}>
                      <button
                        onClick={() => setShowModeDropdown(!showModeDropdown)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all border",
                          teachingMode === 'socratic'
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                            : teachingMode === 'direct'
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                            : "bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 text-accent-primary border-accent-primary/30 dark:border-accent-primary/50"
                        )}
                      >
                        {(() => {
                          const currentMode = teachingModes.find(m => m.value === teachingMode)
                          const Icon = currentMode?.icon || Brain
                          return (
                            <>
                              <Icon className="w-3.5 h-3.5" />
                              {currentMode?.label}
                              <ChevronDown className={cn(
                                "w-3 h-3 transition-transform",
                                showModeDropdown && "rotate-180"
                              )} />
                            </>
                          )
                        })()}
                      </button>

                      {/* Dropdown Menu */}
                      {showModeDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                          {teachingModes.map((mode) => {
                            const Icon = mode.icon
                            const isActive = teachingMode === mode.value
                            return (
                              <button
                                key={mode.value}
                                onClick={() => {
                                  setTeachingMode(mode.value)
                                  setShowModeDropdown(false)
                                }}
                                className={cn(
                                  "w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                                  isActive
                                    ? "bg-accent-primary/10 dark:bg-accent-primary/20"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                )}
                              >
                                <Icon className={cn(
                                  "w-4 h-4 flex-shrink-0 mt-0.5",
                                  isActive ? "text-accent-primary" : mode.color
                                )} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-sm font-semibold",
                                      isActive ? "text-accent-primary" : "text-gray-900 dark:text-white"
                                    )}>
                                      {mode.label}
                                    </span>
                                    {isActive && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {mode.description}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-h-0 p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bot className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Ready to chat!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Ask me anything about your document below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={messagesContainerRef}
                    className="chat-scrollbar space-y-4 flex-1 overflow-y-auto pr-2"
                  >
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.type === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex max-w-[85%] gap-2",
                            message.type === "user" ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              message.type === "user"
                                ? "bg-gradient-to-br from-accent-primary to-accent-secondary"
                                : "bg-accent-primary/10 dark:bg-accent-primary/20"
                            )}
                          >
                            {message.type === "user" ? (
                              <User className="h-4 w-4 text-white" />
                            ) : (
                              <Bot className="h-4 w-4 text-accent-primary" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2",
                              message.type === "user"
                                ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white"
                                : "bg-accent-primary/5 dark:bg-accent-primary/10 text-gray-900 dark:text-gray-100 border border-accent-primary/30 dark:border-accent-primary/50"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex gap-2">
                          <div className="w-8 h-8 bg-accent-primary/10 dark:bg-accent-primary/20 rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-accent-primary" />
                          </div>
                          <div className="bg-accent-primary/5 dark:bg-accent-primary/10 rounded-lg px-4 py-2 flex items-center gap-2 border border-accent-primary/30 dark:border-accent-primary/50">
                            <Loader2 className="h-4 w-4 animate-spin text-accent-primary" />
                            <span className="text-sm text-accent-primary">
                              Thinking...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-2">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about the document..."
                    disabled={chatDocument.isProcessing}
                    className="flex-1 resize-none border border-accent-primary/30 dark:border-accent-primary/50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-accent-primary focus:border-transparent bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm min-h-[44px] max-h-[120px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || chatDocument.isProcessing}
                    className={cn(
                      "px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white rounded-lg transition-colors flex items-center justify-center min-w-[44px] shadow-lg",
                      (!inputMessage.trim() || isLoading || chatDocument.isProcessing) &&
                      "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Document Switcher */}
        <DocumentSwitcherModal
          onDocumentSwitch={() => {
            // Reload chat interface with new document
            if (currentDocument) {
              setChatDocument({
                file: null,
                content: currentDocument.content,
                isProcessing: false
              })
              // Clear messages for new document conversation
              setMessages([])
            }
          }}
        />

        {/* Section Navigator */}
        {currentDocument?.sections && currentDocument.sections.sections.length > 0 && (
          <SectionNavigator
            sections={currentDocument.sections.sections}
            onSectionClick={(section: DocumentSection) => {
              // Auto-populate input with question about the section
              setInputMessage(`Tell me about the "${section.title}" section`)
            }}
          />
        )}
    </div>
  )
}
