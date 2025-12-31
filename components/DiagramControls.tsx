"use client"

import { ZoomIn, ZoomOut, Maximize2, Download, Minimize2 } from 'lucide-react'

interface DiagramControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onExpand: () => void
  onFitToView?: () => void
  onDownload?: () => void
  onClose?: () => void
  isModal?: boolean
  minScale?: number
  maxScale?: number
  presetScales?: number[]
  onScaleChange?: (scale: number) => void
}

export default function DiagramControls({
  scale,
  onZoomIn,
  onZoomOut,
  onExpand,
  onFitToView,
  onDownload,
  onClose,
  isModal = false,
  minScale = 0.25,
  maxScale = 3,
  presetScales = [0.25, 0.5, 1, 1.5, 2],
  onScaleChange
}: DiagramControlsProps) {
  const scalePercent = Math.round(scale * 100)
  const canZoomIn = scale < maxScale
  const canZoomOut = scale > minScale

  // Inline controls (compact, floating in corner)
  if (!isModal) {
    return (
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-10 opacity-70 hover:opacity-100 transition-opacity">
        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Scale Display */}
        <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[45px] text-center">
          {scalePercent}%
        </span>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Expand Button */}
        <button
          onClick={onExpand}
          className="p-1.5 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          title="Expand to fullscreen"
          aria-label="Expand to fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </button>
      </div>
    )
  }

  // Modal controls (full toolbar at bottom)
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      {/* Left: Zoom controls */}
      <div className="flex items-center gap-2">
        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out (−)"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Preset Zoom Levels */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {presetScales.map((preset) => {
            const isActive = Math.abs(scale - preset) < 0.05
            return (
              <button
                key={preset}
                onClick={() => onScaleChange?.(preset)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            )
          })}
        </div>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in (+)"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Fit to View */}
        {onFitToView && (
          <button
            onClick={onFitToView}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Fit to screen"
          >
            Fit
          </button>
        )}

        {/* Download */}
        {onDownload && (
          <button
            onClick={onDownload}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Download diagram"
            aria-label="Download diagram"
          >
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}
