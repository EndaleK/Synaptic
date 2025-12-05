"use client"

/**
 * DocumentImageGallery Component
 *
 * Displays images extracted from a PDF document in a collapsible gallery.
 * Allows users to view and reference images during chat conversations.
 */

import { useState, useEffect } from 'react'
import { Image as ImageIcon, ChevronDown, ChevronUp, Loader2, X, ZoomIn, Download, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ToastContainer'

interface DocumentImage {
  id: string
  pageNumber: number
  imageIndex: number
  storageUrl: string
  width: number
  height: number
  mimeType: string
  description?: string
}

interface DocumentImageGalleryProps {
  documentId: string
  className?: string
  onImageSelect?: (image: DocumentImage) => void
}

export default function DocumentImageGallery({
  documentId,
  className,
  onImageSelect
}: DocumentImageGalleryProps) {
  const toast = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [images, setImages] = useState<DocumentImage[]>([])
  const [imagesExtracted, setImagesExtracted] = useState(false)
  const [selectedImage, setSelectedImage] = useState<DocumentImage | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch images when expanded
  useEffect(() => {
    if (isExpanded && documentId && !imagesExtracted) {
      fetchImages()
    }
  }, [isExpanded, documentId])

  const fetchImages = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/images`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch images')
      }

      const data = await response.json()
      setImages(data.images || [])
      setImagesExtracted(data.imagesExtracted || false)
    } catch (err) {
      console.error('Error fetching images:', err)
      setError(err instanceof Error ? err.message : 'Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }

  const extractImages = async () => {
    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/images`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to extract images')
      }

      const data = await response.json()
      setImages(data.images || [])
      setImagesExtracted(true)

      if (data.imageCount === 0) {
        toast.info('No images found in this document')
      } else {
        toast.success(`Extracted ${data.imageCount} images from the document`)
      }
    } catch (err) {
      console.error('Error extracting images:', err)
      setError(err instanceof Error ? err.message : 'Failed to extract images')
      toast.error('Failed to extract images')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleImageClick = (image: DocumentImage) => {
    setSelectedImage(image)
    onImageSelect?.(image)
  }

  const handleDownload = async (image: DocumentImage) => {
    try {
      const response = await fetch(image.storageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `page_${image.pageNumber}_image_${image.imageIndex}.${image.mimeType.split('/')[1]}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Failed to download image')
    }
  }

  return (
    <div className={cn("border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            Document Images
          </span>
          {images.length > 0 && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
              {images.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading images...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchImages}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : !imagesExtracted ? (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Images haven't been extracted from this document yet.
              </p>
              <button
                onClick={extractImages}
                disabled={isExtracting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Extract Images
                  </>
                )}
              </button>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                No images found in this document.
              </p>
            </div>
          ) : (
            <>
              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                    onClick={() => handleImageClick(image)}
                  >
                    <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                      <img
                        src={image.storageUrl}
                        alt={`Page ${image.pageNumber}, Image ${image.imageIndex + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    {/* Page number badge */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                      p. {image.pageNumber}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Click an image to view it larger or reference it in your chat
              </p>
            </>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Page {selectedImage.pageNumber}, Image {selectedImage.imageIndex + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)]">
              <img
                src={selectedImage.storageUrl}
                alt={`Page ${selectedImage.pageNumber}, Image ${selectedImage.imageIndex + 1}`}
                className="max-w-full h-auto mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
