"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import DiagramControls from './DiagramControls'

interface DiagramModalProps {
  isOpen: boolean
  onClose: () => void
  svg: string
  title?: string
  minScale?: number
  maxScale?: number
}

export default function DiagramModal({
  isOpen,
  onClose,
  svg,
  title,
  minScale = 0.25,
  maxScale = 3
}: DiagramModalProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          handleReset()
          break
        case 'ArrowUp':
          setPosition(prev => ({ ...prev, y: prev.y + 50 }))
          break
        case 'ArrowDown':
          setPosition(prev => ({ ...prev, y: prev.y - 50 }))
          break
        case 'ArrowLeft':
          setPosition(prev => ({ ...prev, x: prev.x + 50 }))
          break
        case 'ArrowRight':
          setPosition(prev => ({ ...prev, x: prev.x - 50 }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Zoom step
  const zoomStep = 0.25

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(maxScale, prev + zoomStep))
  }, [maxScale])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(minScale, prev - zoomStep))
  }, [minScale])

  const handleReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  // Fit to view - calculate scale to fit SVG in viewport
  const handleFitToView = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return

    const container = containerRef.current.getBoundingClientRect()
    const content = contentRef.current.getBoundingClientRect()

    // Calculate scale to fit content in container with padding
    const padding = 40
    const scaleX = (container.width - padding * 2) / (content.width / scale)
    const scaleY = (container.height - padding * 2) / (content.height / scale)
    const fitScale = Math.min(scaleX, scaleY, 1) // Don't exceed 100%

    setScale(Math.max(minScale, Math.min(maxScale, fitScale)))
    setPosition({ x: 0, y: 0 })
  }, [scale, minScale, maxScale])

  // Download as PNG
  const handleDownload = useCallback(async () => {
    try {
      // Create a temporary container
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = svg
      const svgElement = tempDiv.querySelector('svg')

      if (!svgElement) {
        console.error('No SVG found')
        return
      }

      // Get SVG dimensions
      const svgRect = svgElement.getBoundingClientRect()
      const width = svgRect.width || 800
      const height = svgRect.height || 600

      // Create canvas
      const canvas = document.createElement('canvas')
      const scale = 2 // Higher resolution
      canvas.width = width * scale
      canvas.height = height * scale

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)

      // Convert SVG to data URL
      const svgString = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      // Draw SVG to canvas
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)

        // Download
        const link = document.createElement('a')
        link.download = `diagram-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = url
    } catch (error) {
      console.error('Failed to download diagram:', error)
    }
  }, [svg])

  // Mouse wheel zoom (no modifier needed in modal)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(maxScale, Math.max(minScale, prev + delta)))
  }, [maxScale, minScale])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }, [position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse up listener
  useEffect(() => {
    if (!isOpen) return
    const handleGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative flex flex-col h-full max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title || 'Diagram Viewer'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Diagram Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="w-full h-full flex items-center justify-center p-8">
            <div
              ref={contentRef}
              className="diagram-modal-content"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>

        {/* Controls Footer */}
        <DiagramControls
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onExpand={() => {}} // Not used in modal
          onFitToView={handleFitToView}
          onDownload={handleDownload}
          onClose={onClose}
          onScaleChange={handleScaleChange}
          isModal={true}
          minScale={minScale}
          maxScale={maxScale}
        />
      </div>

      {/* Global styles for modal diagram */}
      <style jsx global>{`
        .diagram-modal-content svg {
          max-width: none !important;
          overflow: visible !important;
        }
        .diagram-modal-content .node rect,
        .diagram-modal-content .node polygon {
          rx: 8px !important;
          ry: 8px !important;
        }
      `}</style>
    </div>
  )
}
