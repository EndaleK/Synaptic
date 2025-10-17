"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, FileText, Bot, User, Loader2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { useDocumentStore } from "@/lib/store/useStore"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { currentDocument, setCurrentDocument } = useDocumentStore()
  const hasLoadedDocument = useRef(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load document from store if available
  useEffect(() => {
    const loadDocument = async () => {
      if (currentDocument && !hasLoadedDocument.current && !chatDocument.file) {
        hasLoadedDocument.current = true

        try {
          let file: File

          // For PDFs, fetch the original file from storage
          if (currentDocument.fileType === 'application/pdf' && currentDocument.storagePath) {
            setChatDocument({
              file: null,
              content: currentDocument.content,
              isProcessing: true
            })

            const response = await fetch(`/api/documents/storage/${encodeURIComponent(currentDocument.storagePath)}`)

            if (!response.ok) {
              throw new Error('Failed to fetch PDF from storage')
            }

            const blob = await response.blob()
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

          const errorMessage: Message = {
            id: Date.now().toString(),
            content: `⚠️ Could not load original ${currentDocument.fileType === 'application/pdf' ? 'PDF' : 'document'}. Showing text content instead. Ask me anything about this document!`,
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

      if (!response.ok) {
        throw new Error(`Failed to get response`)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: generateId() + '-response',
        content: data.response || "I apologize, but I'm having trouble processing your request.",
        type: "assistant",
        timestamp: generateTimestamp()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
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
          /* Upload Area - Full Width */
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={triggerChatFileInput}
              className="w-full max-w-2xl flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-xl hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-300 group cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 p-12"
            >
              <div className="text-center max-w-md">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg mb-6">
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
                  className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto mb-4"
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {chatDocument.file?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    Change
                  </button>
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
                                ? "bg-black dark:bg-white"
                                : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            {message.type === "user" ? (
                              <User className="h-4 w-4 text-white dark:text-black" />
                            ) : (
                              <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2",
                              message.type === "user"
                                ? "bg-black dark:bg-white text-white dark:text-black"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
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
                    className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm min-h-[44px] max-h-[120px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading || chatDocument.isProcessing}
                    className={cn(
                      "px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center justify-center min-w-[44px]",
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
    </div>
  )
}
