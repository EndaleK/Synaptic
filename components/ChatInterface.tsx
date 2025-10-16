"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, FileText, Bot, User, Loader2, Upload, X, Eye, MessageCircle, SplitSquareHorizontal, ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-body-sm text-gray-600 dark:text-gray-400">Loading PDF Viewer...</p>
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

type ViewMode = "chat" | "pdf" | "split"

interface ChatInterfaceProps {}

export default function ChatInterface({}: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("chat")
  const [chatDocument, setChatDocument] = useState<ChatDocument>({
    file: null,
    content: "",
    isProcessing: false
  })
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const splitMessagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)

  // Track if we're on the client to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Generate client-safe IDs to avoid hydration mismatches
  const generateId = useCallback(() => {
    if (!isClient) return 'temp-id'
    return Date.now().toString()
  }, [isClient])

  const generateTimestamp = useCallback(() => {
    if (!isClient) return new Date(0) // Use epoch time for SSR
    return new Date()
  }, [isClient])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToTop = () => {
    const container = messagesContainerRef.current || splitMessagesContainerRef.current
    container?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleScroll = useCallback(() => {
    // Check both containers (split view and regular view)
    const container = messagesContainerRef.current || splitMessagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
    const isAtTopPosition = scrollTop < 10

    setShowScrollToBottom(!isAtBottom && messages.length > 3)
    setIsAtTop(isAtTopPosition)
  }, [messages.length])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current || splitMessagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll, viewMode])

  // Watch for document changes and add system message
  useEffect(() => {
    if (chatDocument.file && messages.length === 0) {
      const fileMessage: Message = {
        id: generateId(),
        content: `📄 Document loaded: ${chatDocument.file.name}. I can now answer questions about this document.`,
        type: "assistant",
        timestamp: generateTimestamp()
      }
      setMessages([fileMessage])
    }
  }, [chatDocument.file, messages.length])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setChatDocument({
        file: selectedFile,
        content: "",
        isProcessing: true
      })
      
      // Extract text content for chat functionality
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
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mode", "file")

      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to extract document content")
      }

      const data = await response.json()
      
      console.log("Document extraction response:", data)
      console.log("Extracted text length:", data.extractedText?.length || 0)
      
      setChatDocument(prev => ({
        ...prev,
        content: data.extractedText || "",
        isProcessing: false
      }))

      // Clear any previous messages and add welcome message
      setMessages([])
      
    } catch (error) {
      console.error("Error extracting document content:", error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Check if this is a large file error
      const isLargeFileError = errorMsg.includes('too large') || errorMsg.includes('100MB')
      
      setChatDocument(prev => ({
        ...prev,
        content: "", // No text content available
        isProcessing: false
      }))
      
      let content = `I encountered an issue processing "${file.name}": ${errorMsg}`
      
      if (isLargeFileError) {
        content += `

📄 **Good news:** You can still view and read your PDF using the "View PDF" mode above!

**Options for large files:**
• Use the PDF viewer to read the document
• Try the "Split" mode to view the PDF while asking questions  
• Break the document into smaller sections (under 100MB each)
• Convert to DOCX or TXT format if possible

The PDF viewer works regardless of file size.`
      } else {
        content += `

**Alternative options:**
• Use the PDF viewer mode to read the document
• Try uploading a DOCX or TXT version  
• Ensure the PDF contains selectable (not scanned) text

For best results with chat functionality:
• DOCX files (most reliable)
• TXT files
• PDFs under 100MB with selectable text`
      }
      
      const errorMessage: Message = {
        id: generateId(),
        content,
        type: "assistant",
        timestamp: generateTimestamp()
      }
      setMessages([errorMessage])
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
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
      console.log("Sending chat request with:")
      console.log("- Message:", inputMessage)
      console.log("- File name:", chatDocument.file?.name)
      console.log("- Document content length:", chatDocument.content?.length || 0)
      console.log("- Document content preview:", chatDocument.content?.substring(0, 200) + "...")
      
      const response = await fetch("/api/chat-with-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          fileName: chatDocument.file?.name,
          documentContent: chatDocument.content,
        }),
      })

      console.log("Chat API response status:", response.status)
      console.log("Chat API response ok:", response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log("Chat API error response:", errorText)
        throw new Error(`Failed to get response: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Chat API response data:", data)
      
      const assistantMessage: Message = {
        id: generateId() + '-response',
        content: data.response || "I apologize, but I'm having trouble processing your request at the moment.",
        type: "assistant",
        timestamp: generateTimestamp()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error details:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error instanceof Error ? error.message : 'Unknown error')
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace')
      const errorMessage: Message = {
        id: generateId() + '-error',
        content: "I apologize, but I'm having trouble accessing the document right now. Please try again.",
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
    const confirmed = window.confirm("Are you sure you want to clear the chat and remove the document? This action cannot be undone.")
    if (confirmed) {
      setChatDocument({
        file: null,
        content: "",
        isProcessing: false
      })
      setMessages([])
      setInputMessage("")
      setIsLoading(false)
    }
  }

  // Check if uploaded file is a PDF
  const isPDFFile = chatDocument.file?.type === "application/pdf"

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black rounded-2xl border border-gray-300 dark:border-gray-700 shadow-xl" style={{ 
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)", 
      borderRadius: "var(--radius-xl)" 
    }}>
      {/* File Status & View Mode Controls */}
      {chatDocument.file && (
        <div 
          className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 rounded-t-2xl"
          style={{ padding: "var(--space-3)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
              <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-white dark:text-black" />
              </div>
              <div>
                <p className="text-body-sm font-medium text-black dark:text-white">
                  {chatDocument.file.name}
                </p>
                <p className="text-caption text-gray-600 dark:text-gray-400">
                  {chatDocument.isProcessing ? "Processing document..." : "Ready for questions"}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-caption text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
              title="Clear chat and remove document"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
          
          {/* View Mode Toggle (only for PDFs) */}
          {isPDFFile && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("chat")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-caption font-medium transition-colors",
                  viewMode === "chat"
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                )}
              >
                <MessageCircle className="h-3 w-3" />
                Chat
              </button>
              <button
                onClick={() => setViewMode("pdf")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-caption font-medium transition-colors",
                  viewMode === "pdf"
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                )}
              >
                <Eye className="h-3 w-3" />
                View PDF
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-caption font-medium transition-colors",
                  viewMode === "split"
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                )}
              >
                <SplitSquareHorizontal className="h-3 w-3" />
                Split
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {!chatDocument.file ? (
          /* Upload Area */
          <div className="h-full" style={{ padding: "var(--space-4)" }}>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={triggerChatFileInput}
              className="h-full flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-xl hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-300 group cursor-pointer min-h-[500px] bg-gray-50/50 dark:bg-gray-900/50"
            >
              <div className="text-center max-w-md">
                <div className="mx-auto w-20 h-20 bg-black dark:bg-white rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg" style={{ marginBottom: "var(--space-4)" }}>
                  <Upload className="h-10 w-10 text-white dark:text-black" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white" style={{ marginBottom: "var(--space-2)" }}>
                  Upload a document to start chatting
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400" style={{ marginBottom: "var(--space-4)" }}>
                  Drag and drop your file here, or choose an option below
                </p>
                
                {/* Upload Buttons */}
                <div className="flex gap-4 justify-center" style={{ marginBottom: "var(--space-4)" }}>
                  <button
                    onClick={triggerChatFileInput}
                    className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Upload className="h-5 w-5" />
                    Choose File
                  </button>
                  <button
                    onClick={triggerChatFileInput}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-200 hover:bg-black dark:hover:bg-white text-white dark:text-black rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <FileText className="h-5 w-5" />
                    Browse Documents
                  </button>
                </div>
                
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
        ) : chatDocument.isProcessing ? (
          /* Loading State */
          <div className="h-full flex items-center justify-center" style={{ padding: "var(--space-4)" }}>
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: "var(--space-4)" }}>
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
              <h3 className="text-heading-md text-gray-900 dark:text-gray-100" style={{ marginBottom: "var(--space-2)" }}>
                Processing document...
              </h3>
              <p className="text-body-md text-gray-600 dark:text-gray-400">
                I'm analyzing your document. This may take a moment...
              </p>
            </div>
          </div>
        ) : viewMode === "pdf" && isPDFFile ? (
          /* PDF Viewer Mode */
          <PDFViewer file={chatDocument.file} className="h-full" />
        ) : viewMode === "split" && isPDFFile ? (
          /* Split View Mode */
          <div className="h-full flex">
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
              <PDFViewer file={chatDocument.file} />
            </div>
            <div className="w-1/2 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col min-h-0" style={{ padding: "var(--space-4)" }}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: "var(--space-4)" }}>
                        <Bot className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-heading-md text-gray-900 dark:text-gray-100" style={{ marginBottom: "var(--space-2)" }}>
                        Ready to chat!
                      </h3>
                      <p className="text-body-md text-gray-600 dark:text-gray-400">
                        Ask me anything about your document below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    ref={splitMessagesContainerRef}
                    className="chat-scrollbar space-y-6 flex-1 overflow-y-auto pr-2 scroll-smooth pt-4 pb-4 max-h-full relative"
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
                            "flex max-w-[80%]",
                            message.type === "user" ? "flex-row-reverse" : "flex-row"
                          )}
                          style={{ gap: "var(--space-2)" }}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              message.type === "user"
                                ? "bg-black dark:bg-white"
                                : "bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            )}
                            onClick={message.type === "assistant" ? () => {
                              const helpMessage: Message = {
                                id: generateId() + '-help',
                                content: "💡 **Quick Help:**\n\n• Upload a document to start chatting\n• Use the PDF viewer for large files\n• Try different file formats (PDF, DOCX, TXT)\n• Clear chat anytime with the 'Clear' button\n\nI'm here to help you understand your documents!",
                                type: "assistant",
                                timestamp: generateTimestamp()
                              }
                              setMessages(prev => [...prev, helpMessage])
                            } : undefined}
                            title={message.type === "assistant" ? "Click for help" : undefined}
                          >
                            {message.type === "user" ? (
                              <User className="h-4 w-4 text-white dark:text-black" />
                            ) : (
                              <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg",
                              message.type === "user"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            )}
                            style={{ padding: "var(--space-3)" }}
                          >
                            <p className="text-body-md whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex" style={{ gap: "var(--space-2)" }}>
                          <div 
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => {
                              const helpMessage: Message = {
                                id: generateId() + '-help',
                                content: "💡 **Quick Help:**\n\n• Upload a document to start chatting\n• Use the PDF viewer for large files\n• Try different file formats (PDF, DOCX, TXT)\n• Clear chat anytime with the 'Clear' button\n\nI'm here to help you understand your documents!",
                                type: "assistant",
                                timestamp: generateTimestamp()
                              }
                              setMessages(prev => [...prev, helpMessage])
                            }}
                            title="Click for help"
                          >
                            <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div 
                            className="bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center"
                            style={{ padding: "var(--space-3)" }}
                          >
                            <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                            <span className="ml-2 text-body-md text-gray-600 dark:text-gray-400">
                              Thinking...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Scroll Controls */}
                    {!isAtTop && messages.length > 3 && (
                      <button
                        onClick={scrollToTop}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
                        title="Scroll to top"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                    )}
                    
                    {showScrollToBottom && (
                      <button
                        onClick={scrollToBottom}
                        className="absolute bottom-2 right-2 z-10 w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 flex items-center justify-center animate-bounce"
                        title="Scroll to bottom"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Input Area for Split View */}
              <div 
                className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
                style={{ padding: "var(--space-3)" }}
              >
                <div className="flex" style={{ gap: "var(--space-2)" }}>
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about the document..."
                    disabled={chatDocument.isProcessing}
                    className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-body-sm"
                    style={{ 
                      padding: "var(--space-2)",
                      borderRadius: "var(--radius-md)",
                      minHeight: "2.5rem",
                      maxHeight: "6rem"
                    }}
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || chatDocument.isProcessing}
                    className={cn(
                      "btn-primary flex items-center justify-center",
                      (!inputMessage.trim() || isLoading || chatDocument.isProcessing) && 
                      "opacity-50 cursor-not-allowed"
                    )}
                    style={{ 
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-md)"
                    }}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Mode */
          <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col min-h-0" style={{ padding: "var(--space-4)" }}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: "var(--space-4)" }}>
                      <Bot className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-heading-md text-gray-900 dark:text-gray-100" style={{ marginBottom: "var(--space-2)" }}>
                      Ready to chat!
                    </h3>
                    <p className="text-body-md text-gray-600 dark:text-gray-400">
                      Ask me anything about your document below.
                    </p>
                  </div>
                </div>
              ) : (
                <div 
                  ref={messagesContainerRef}
                  className="chat-scrollbar space-y-6 flex-1 overflow-y-auto pr-2 scroll-smooth pt-4 pb-4 max-h-full relative"
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
                          "flex max-w-[80%]",
                          message.type === "user" ? "flex-row-reverse" : "flex-row"
                        )}
                        style={{ gap: "var(--space-2)" }}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            message.type === "user"
                              ? "bg-black dark:bg-white"
                              : "bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          )}
                          onClick={message.type === "assistant" ? () => {
                            const helpMessage: Message = {
                              id: generateId() + '-help',
                              content: "💡 **Quick Help:**\n\n• Upload a document to start chatting\n• Use the PDF viewer for large files\n• Try different file formats (PDF, DOCX, TXT)\n• Clear chat anytime with the 'Clear' button\n\nI'm here to help you understand your documents!",
                              type: "assistant",
                              timestamp: generateTimestamp()
                            }
                            setMessages(prev => [...prev, helpMessage])
                          } : undefined}
                          title={message.type === "assistant" ? "Click for help" : undefined}
                        >
                          {message.type === "user" ? (
                            <User className="h-4 w-4 text-white dark:text-black" />
                          ) : (
                            <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-lg",
                            message.type === "user"
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          )}
                          style={{ padding: "var(--space-3)" }}
                        >
                          <p className="text-body-md whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex" style={{ gap: "var(--space-2)" }}>
                        <div 
                          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => {
                            const helpMessage: Message = {
                              id: generateId() + '-help',
                              content: "💡 **Quick Help:**\n\n• Upload a document to start chatting\n• Use the PDF viewer for large files\n• Try different file formats (PDF, DOCX, TXT)\n• Clear chat anytime with the 'Clear' button\n\nI'm here to help you understand your documents!",
                              type: "assistant",
                              timestamp: generateTimestamp()
                            }
                            setMessages(prev => [...prev, helpMessage])
                          }}
                          title="Click for help"
                        >
                          <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div 
                          className="bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center"
                          style={{ padding: "var(--space-3)" }}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                          <span className="ml-2 text-body-md text-gray-600 dark:text-gray-400">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Scroll Controls */}
                  {!isAtTop && messages.length > 3 && (
                    <button
                      onClick={scrollToTop}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
                      title="Scroll to top"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                  )}
                  
                  {showScrollToBottom && (
                    <button
                      onClick={scrollToBottom}
                      className="absolute bottom-2 right-2 z-10 w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 flex items-center justify-center animate-bounce"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area (only show for chat mode and when not PDF-only view) */}
      {(!isPDFFile || viewMode === "chat") && chatDocument.file && !chatDocument.isProcessing && (
        <div 
          className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl"
          style={{ padding: "var(--space-4)" }}
        >
          <div className="flex" style={{ gap: "var(--space-2)" }}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the document..."
              className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-body-md"
              style={{ 
                padding: "var(--space-3)",
                borderRadius: "var(--radius-lg)",
                minHeight: "3rem",
                maxHeight: "8rem"
              }}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={cn(
                "btn-primary flex items-center justify-center",
                (!inputMessage.trim() || isLoading) && 
                "opacity-50 cursor-not-allowed"
              )}
              style={{ 
                width: "3rem",
                height: "3rem",
                borderRadius: "var(--radius-lg)"
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}