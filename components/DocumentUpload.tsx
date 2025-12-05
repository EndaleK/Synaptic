"use client"

import { useState, useEffect, useRef } from "react"
import { Upload, FileText, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Flashcard } from "@/lib/types"
import { useDocumentStore } from "@/lib/store/useStore"
import { useToast } from "@/components/ToastContainer"

interface DocumentUploadProps {
  onFlashcardsGenerated: (flashcards: Flashcard[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export default function DocumentUpload({
  onFlashcardsGenerated,
  isLoading,
  setIsLoading
}: DocumentUploadProps) {
  const toast = useToast()
  const [textContent, setTextContent] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")
  const [file, setFile] = useState<File | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documentJSON, setDocumentJSON] = useState<any>(null)
  const [showJSON, setShowJSON] = useState(false)
  const { currentDocument, setCurrentDocument } = useDocumentStore()
  const hasGeneratedFlashcards = useRef(false)

  // Auto-generate flashcards from pre-loaded document
  useEffect(() => {
    const generateFromDocument = async () => {
      if (currentDocument && !hasGeneratedFlashcards.current && !file) {
        hasGeneratedFlashcards.current = true
        setIsLoading(true)

        try {
          const formData = new FormData()
          formData.append("text", currentDocument.content)
          formData.append("mode", "text")

          const response = await fetch("/api/generate-flashcards", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error("Failed to generate flashcards")
          }

          const data = await response.json()

          // Store the JSON structure if available
          if (data.documentJSON) {
            setDocumentJSON(data.documentJSON)
            console.log("Document JSON structure:", data.documentJSON)
          }

          onFlashcardsGenerated(data.flashcards)
        } catch (error) {
          console.error("Error generating flashcards:", error)
          toast.error(error instanceof Error ? error.message : "Failed to generate flashcards")
        } finally {
          setIsLoading(false)
        }
      }
    }

    generateFromDocument()
  }, [currentDocument, file, setIsLoading, onFlashcardsGenerated])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const triggerFileInput = () => {
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const handleGenerate = async () => {
    setIsLoading(true)

    try {
      const formData = new FormData()

      // Upload new file
      if (activeTab === "upload" && file) {
        // Save document to Supabase
        const docFormData = new FormData()
        docFormData.append("file", file)

        const docResponse = await fetch("/api/documents", {
          method: "POST",
          body: docFormData,
        })

        if (!docResponse.ok) {
          const errorData = await docResponse.json()
          throw new Error(errorData.error || "Failed to save document")
        }

        const docData = await docResponse.json()
        console.log("Document saved:", docData.document)

        // Use extracted text for flashcard generation
        formData.append("text", docData.document.extracted_text || "")
        formData.append("mode", "text")
      }
      // Paste text
      else if (activeTab === "paste" && textContent) {
        formData.append("text", textContent)
        formData.append("mode", "text")
      } else {
        throw new Error("Please provide content to generate flashcards")
      }

      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to generate flashcards")
      }

      const data = await response.json()

      // Store the JSON structure if available
      if (data.documentJSON) {
        setDocumentJSON(data.documentJSON)
        console.log("Document JSON structure:", data.documentJSON)
      }

      onFlashcardsGenerated(data.flashcards)
    } catch (error) {
      console.error("Error generating flashcards:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate flashcards")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    const confirmed = window.confirm("Are you sure you want to remove the uploaded file? This will clear the current document.")
    if (confirmed) {
      setFile(null)
      setDocumentJSON(null)
      setShowJSON(false)
      setTextContent("")
      setCurrentDocument(null)
      hasGeneratedFlashcards.current = false
    }
  }

  return (
    <div className="h-full">
      <div className="h-full bg-white dark:bg-black rounded-2xl border border-gray-300 dark:border-gray-700 shadow-xl card-hover flex flex-col" style={{ 
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)", 
        borderRadius: "var(--radius-xl)" 
      }}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 text-body-sm font-medium border-b-2 transition-all duration-300 relative",
                activeTab === "upload"
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-gray-500 hover:text-accent-primary hover:border-accent-primary/50 dark:text-gray-400"
              )}
              style={{
                padding: "var(--space-3) var(--space-4)"
              }}
            >
              <div className="flex items-center justify-center" style={{ gap: "var(--space-2)" }}>
                <Upload className="h-4 w-4" />
                Upload Document
              </div>
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={cn(
                "flex-1 text-body-sm font-medium border-b-2 transition-all duration-300 relative",
                activeTab === "paste"
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-gray-500 hover:text-accent-primary hover:border-accent-primary/50 dark:text-gray-400"
              )}
              style={{
                padding: "var(--space-3) var(--space-4)"
              }}
            >
              <div className="flex items-center justify-center" style={{ gap: "var(--space-2)" }}>
                <FileText className="h-4 w-4" />
                Paste Text
              </div>
            </button>
          </nav>
        </div>
        
        <div className="flex-1 flex flex-col" style={{ padding: "var(--space-6)" }}>
          {activeTab === "upload" ? (
            <div className="flex-1 flex flex-col">
              {/* Upload Area */}
              <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={triggerFileInput}
                    className="border-2 border-dashed border-accent-primary/30 dark:border-accent-primary/50 rounded-lg text-center hover:border-accent-primary dark:hover:border-accent-primary hover:bg-accent-primary/5 dark:hover:bg-accent-primary/10 transition-all duration-300 group flex items-center justify-center min-h-[400px] cursor-pointer bg-accent-primary/5 dark:bg-accent-primary/5"
                    style={{
                      padding: "var(--space-8)",
                      borderRadius: "var(--radius-xl)"
                    }}
                  >
                    <div className="text-center">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-lg" style={{ marginBottom: "var(--space-4)" }}>
                        <Upload className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-black dark:text-white" style={{ marginBottom: "var(--space-2)" }}>
                        Upload your document
                      </h3>
                      <p className="text-lg text-gray-600 dark:text-gray-400" style={{ marginBottom: "var(--space-4)" }}>
                        Drag and drop your file here, or choose an option below
                      </p>

                      {/* Upload Buttons */}
                      <div className="flex gap-4 justify-center" style={{ marginBottom: "var(--space-4)" }}>
                        <button
                          onClick={triggerFileInput}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Upload className="h-5 w-5" />
                          Choose File
                        </button>
                        <button
                          onClick={triggerFileInput}
                          className="flex items-center gap-2 px-6 py-3 bg-accent-primary/10 dark:bg-accent-primary/20 hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 text-accent-primary rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 border border-accent-primary/30 dark:border-accent-primary/50"
                        >
                          <FileText className="h-5 w-5" />
                          Browse Documents
                        </button>
                      </div>

                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.txt,.doc,.docx,.json,.md"
                      />

                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Supported formats: PDF, TXT, DOC, DOCX, JSON, MD
                      </p>
                    </div>
                  </div>
              {file && (
                <div
                  className="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between animate-in"
                  style={{
                    marginTop: "var(--space-4)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-lg)"
                  }}
                >
                  <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                    <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white dark:text-black" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-body-sm font-medium text-black dark:text-white">{file.name}</p>
                      <p className="text-caption text-gray-600 dark:text-gray-400">Ready to generate flashcards</p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 text-caption text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Remove uploaded file"
                  >
                    <X className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="relative flex-1">
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste your study material here... 

Examples:
• Course notes and lecture content
• Book chapters or articles  
• Study guides and summaries
• Any educational text content"
                  className="w-full h-full border border-gray-300 dark:border-gray-600 resize-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-700 dark:text-gray-100 text-body-md transition-all duration-200"
                  style={{ 
                    minHeight: "20rem",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-lg)"
                  }}
                />
                {textContent && (
                  <div className="absolute bottom-3 right-3 text-caption text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded">
                    {textContent.length} characters
                  </div>
                )}
              </div>
              <p className="text-body-sm text-gray-600 dark:text-gray-400" style={{ marginTop: "var(--space-2)" }}>
                Paste any educational text content to automatically generate interactive flashcards
              </p>
            </div>
          )}

          <div className="flex justify-center" style={{ marginTop: "var(--space-6)" }}>
            <button
              onClick={handleGenerate}
              disabled={isLoading || (!file && !textContent)}
              className={cn(
                "btn-primary flex items-center gap-2 transition-all duration-200 px-8 py-3 text-lg font-semibold",
                isLoading || (!file && !textContent)
                  ? "opacity-50 cursor-not-allowed transform-none shadow-none"
                  : "shadow-lg hover:shadow-xl transform hover:scale-105"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Flashcards"
              )}
            </button>
          </div>
          
          {documentJSON && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJSON(!showJSON)}
                  className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showJSON ? "Hide" : "View"} Document Structure
                </button>
                <span className="text-gray-400">•</span>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(documentJSON, null, 2)
                    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
                    const linkElement = document.createElement('a')
                    linkElement.setAttribute('href', dataUri)
                    linkElement.setAttribute('download', `${documentJSON.metadata.title}-structure.json`)
                    linkElement.click()
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Download JSON
                </button>
              </div>
              
              {showJSON && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(documentJSON, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}