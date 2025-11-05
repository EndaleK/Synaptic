"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Calendar, HardDrive, Download, Loader2, Sparkles, Brain } from "lucide-react"
import { Document as PDFDocument } from "@/lib/supabase/types"
import Breadcrumb from "@/components/Breadcrumb"
import PageTopicSelector, { SelectionData } from "@/components/PageTopicSelector"

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [document, setDocument] = useState<PDFDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionData>({ type: 'full' })
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/documents/${documentId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch document')
        }

        const data = await response.json()
        setDocument(data.document)

        // Get the PDF URL from storage
        // Priority 1: Use R2 URL from metadata if available
        // Priority 2: Construct Supabase Storage public URL
        if (data.document.metadata?.r2_url) {
          console.log('📄 Using R2 URL:', data.document.metadata.r2_url)
          setPdfUrl(data.document.metadata.r2_url)
        } else if (data.document.storage_path) {
          // For Supabase Storage, construct the public URL
          const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${data.document.storage_path}`
          console.log('📄 Using Supabase Storage URL:', storageUrl)
          setPdfUrl(storageUrl)
        } else {
          console.error('❌ No storage path or R2 URL found for document')
        }
      } catch (err) {
        console.error('Error fetching document:', err)
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Documents', href: '/dashboard/documents' },
    { label: document?.file_name || 'Loading...', href: '#', active: true }
  ]

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleGenerateFlashcards = async () => {
    if (!document) return

    setIsGeneratingFlashcards(true)
    try {
      const response = await fetch('/api/generate-flashcards-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          selection,
          count: 15
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate flashcards')
      }

      const data = await response.json()

      // Redirect to flashcards page/mode
      router.push(`/dashboard?mode=flashcards&documentId=${document.id}`)
    } catch (error) {
      console.error('Error generating flashcards:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate flashcards')
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleGeneratePodcast = async () => {
    if (!document) return

    setIsGeneratingPodcast(true)
    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          selection,
          format: 'deep-dive',
          targetDuration: 10
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate podcast')
      }

      const data = await response.json()

      // Redirect to podcast page/mode
      router.push(`/dashboard?mode=podcast&documentId=${document.id}`)
    } catch (error) {
      console.error('Error generating podcast:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate podcast')
    } finally {
      setIsGeneratingPodcast(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-700 dark:text-red-400">{error || 'Document not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Documents
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {document.file_name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" />
                  {formatFileSize(document.file_size)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(document.created_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {document.file_type}
                </div>
              </div>
            </div>

            {pdfUrl && (
              <a
                href={pdfUrl}
                download={document.file_name}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        {document.file_type === 'application/pdf' && pdfUrl ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="w-full h-[calc(100vh-300px)] min-h-[600px]">
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title={document.file_name}
              />
            </div>
          </div>
        ) : document.file_type === 'application/pdf' && !pdfUrl ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-8 text-center">
            <FileText className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              PDF Visual Preview Unavailable
            </h3>
            <p className="text-yellow-800 dark:text-yellow-200 mb-4">
              The PDF file is uploaded and text has been extracted, but the visual preview cannot be loaded.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You can still generate flashcards, podcasts, and mind maps from the extracted text below.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Visual preview is only available for PDF files. This is a {document.file_type || 'text'} document.
            </p>
          </div>
        )}

        {/* Content Selection & Generation */}
        {document.processing_status === 'completed' && document.metadata?.page_count && (
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Generate Learning Content
            </h2>

            <PageTopicSelector
              documentId={documentId}
              totalPages={document.metadata.page_count}
              onSelectionChange={setSelection}
              className="mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards || isGeneratingPodcast}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingFlashcards ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Flashcards...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Generate Flashcards
                  </>
                )}
              </button>

              <button
                onClick={handleGeneratePodcast}
                disabled={isGeneratingFlashcards || isGeneratingPodcast}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPodcast ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Podcast...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Podcast
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Select content above to generate flashcards or a podcast from specific pages, topics, or the full document.
            </p>
          </div>
        )}

        {/* Content Selection Unavailable Message */}
        {document.processing_status !== 'completed' && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Document Processing
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your document is still being processed. Content selection and learning tools will be available once processing completes.
                </p>
              </div>
            </div>
          </div>
        )}

        {document.processing_status === 'completed' && !document.metadata?.page_count && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Content Selection Unavailable
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  Page information is not available for this document. You can still generate flashcards, podcasts, and mind maps from the full document.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Note: This may occur with older uploads or non-PDF documents. Try re-uploading the file to enable page-based content selection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Document Info */}
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Document Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <p className="text-gray-900 dark:text-gray-100">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  document.processing_status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : document.processing_status === 'processing'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                }`}>
                  {document.processing_status === 'completed' ? 'Ready' :
                   document.processing_status === 'processing' ? 'Processing' : 'Failed'}
                </span>
              </p>
            </div>
            {document.metadata?.page_count && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pages</p>
                <p className="text-gray-900 dark:text-gray-100">{document.metadata.page_count}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uploaded</p>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(document.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Updated</p>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(document.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
