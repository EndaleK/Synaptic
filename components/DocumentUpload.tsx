"use client"

import { useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Flashcard } from "@/lib/types"

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
  const [file, setFile] = useState<File | null>(null)
  const [textContent, setTextContent] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documentJSON, setDocumentJSON] = useState<any>(null)
  const [showJSON, setShowJSON] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
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
      
      if (activeTab === "upload" && file) {
        formData.append("file", file)
        formData.append("mode", "file")
      } else if (activeTab === "paste" && textContent) {
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
      alert(error instanceof Error ? error.message : "Failed to generate flashcards")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("upload")}
            className={cn(
              "px-4 py-2 font-medium transition-colors",
              activeTab === "upload"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Upload Document
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={cn(
              "px-4 py-2 font-medium transition-colors ml-4",
              activeTab === "paste"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Paste Text
          </button>
        </div>

        {activeTab === "upload" ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Drag & drop your document here, or
            </p>
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-700 font-medium">
                browse files
              </span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.txt,.doc,.docx,.json"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Supports PDF, TXT, DOC, DOCX, JSON
            </p>
            {file && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your text content here..."
              className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            />
            <p className="text-sm text-gray-500 mt-2">
              Paste any text content to generate flashcards
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleGenerate}
            disabled={isLoading || (!file && !textContent)}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-medium transition-all",
              "flex items-center justify-center gap-2",
              isLoading || (!file && !textContent)
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating flashcards...
              </>
            ) : (
              "Generate Flashcards"
            )}
          </button>
          
          {documentJSON && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowJSON(!showJSON)}
                className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                {showJSON ? "Hide" : "View"} Document JSON
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(documentJSON, null, 2)
                  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
                  const linkElement = document.createElement('a')
                  linkElement.setAttribute('href', dataUri)
                  linkElement.setAttribute('download', `${documentJSON.metadata.title}-structure.json`)
                  linkElement.click()
                }}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
              >
                Download JSON
              </button>
            </div>
          )}
          
          {showJSON && documentJSON && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
              <h4 className="font-semibold mb-2">Document Structure:</h4>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(documentJSON, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}