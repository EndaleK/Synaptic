"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import DiagramControls from './DiagramControls'
import DiagramModal from './DiagramModal'

interface DiagramViewerProps {
  svg: string
  title?: string
  initialScale?: number
  minScale?: number
  maxScale?: number
  className?: string
}

export default function DiagramViewer({
  svg,
  title,
  initialScale = 1,
  minScale = 0.25,
  maxScale = 3,
  className = ''
}: DiagramViewerProps) {
  const [scale, setScale] = useState(initialScale)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Zoom step
  const zoomStep = 0.25

  // Zoom in
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(maxScale, prev + zoomStep))
  }, [maxScale])

  // Zoom out
  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(minScale, prev - zoomStep))
  }, [minScale])

  // Reset zoom and position
  const handleReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Handle mouse wheel zoom (with Ctrl/Cmd)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return

    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(maxScale, Math.max(minScale, prev + delta)))
  }, [maxScale, minScale])

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return // Only allow pan when zoomed in

    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }, [scale, position])

  // Handle drag move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle double-click to reset
  const handleDoubleClick = useCallback(() => {
    handleReset()
  }, [handleReset])

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  // Calculate cursor style
  const cursorStyle = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'

  return (
    <>
      {/* Inline Diagram Viewer */}
      <div className={`diagram-viewer-wrapper my-6 ${className}`}>
        {/* Container with gradient border effect */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
            padding: '1px',
          }}
        >
          {/* Diagram container */}
          <div
            ref={containerRef}
            className="relative w-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden"
            style={{ minHeight: '200px' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            {/* Scrollable content area */}
            <div
              className="w-full overflow-auto p-6"
              style={{
                maxHeight: '500px',
                cursor: cursorStyle,
              }}
            >
              {/* Zoomable/Pannable content */}
              <div
                ref={contentRef}
                className="inline-block min-w-full"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transformOrigin: 'top left',
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>

            {/* Inline Controls */}
            <DiagramControls
              scale={scale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onExpand={() => setIsModalOpen(true)}
              minScale={minScale}
              maxScale={maxScale}
            />
          </div>
        </div>

        {/* Subtle diagram label */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {scale !== 1 ? `${Math.round(scale * 100)}% • ` : ''}
            Ctrl+scroll to zoom • Double-click to reset
          </span>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <DiagramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        svg={svg}
        title={title}
        minScale={minScale}
        maxScale={maxScale}
      />
    </>
  )
}
