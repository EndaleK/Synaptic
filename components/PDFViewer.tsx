"use client"

import { useState, useCallback, useEffect } from "react"
import { Document, Page } from "react-pdf"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, RefreshCw, AlertCircle, Clock, StopCircle, BarChart3, Eye, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePDFTimeout } from "@/hooks/usePDFTimeout"
import { pdfAnalytics } from "@/lib/pdf-analytics"

interface PDFViewerProps {
  file: File
  className?: string
}

type RenderMode = 'react-pdf' | 'iframe' | 'download-only'

export default function PDFViewer({ file, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [workerStatus, setWorkerStatus] = useState<string>("Using browser PDF viewer")
  const [retryCount, setRetryCount] = useState<number>(0)
  const [abortAttempted, setAbortAttempted] = useState<boolean>(false)
  const [pdfWorkerManager, setPdfWorkerManager] = useState<any>(null)
  const [renderMode, setRenderMode] = useState<RenderMode>('iframe')
  const [pdfUrl, setPdfUrl] = useState<string>("")

  // Initialize timeout management
  const timeout = usePDFTimeout({
    loadTimeout: 30000,      // 30 seconds max
    progressTimeout: 10000,  // 10 seconds without progress = stuck
    healthCheckInterval: 1000 // Check every second
  })

  // Create PDF URL for iframe fallback and start analytics
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
      
      // Start analytics session
      pdfAnalytics.startSession(file.size, file.name)
      
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [file])

  // Separate effect for ending analytics session
  useEffect(() => {
    return () => {
      if (file) {
        pdfAnalytics.endSession(!error && numPages > 0)
      }
    }
  }, [file, error, numPages])

  // Initialize PDF worker with status tracking
  useEffect(() => {
    let mounted = true

    const initializeWorker = async () => {
      try {
        setWorkerStatus("Loading PDF components...")
        setIsLoading(true)
        setError("")

        // Dynamically import pdf-worker-manager
        const { pdfWorkerManager: manager } = await import("@/lib/pdf-worker-manager")
        if (!mounted) return
        
        setPdfWorkerManager(manager)
        setWorkerStatus("Initializing PDF worker...")

        const initStartTime = performance.now()
        const result = await manager.initialize()
        const initTime = performance.now() - initStartTime
        
        if (!mounted) return

        // Log worker initialization
        pdfAnalytics.logWorkerInit(result.source || 'unknown', initTime, result.success)

        if (result.success) {
          setWorkerStatus(`Ready (${result.source})`)
          console.log('✅ PDF Worker ready:', result.source)
          
          // Start timeout monitoring when worker is ready and PDF loading begins
          timeout.startTimeout()
        } else {
          setWorkerStatus("Worker initialization failed")
          setError(`PDF worker initialization failed: ${result.error || 'Unknown error'}`)
          pdfAnalytics.logError(`Worker init failed: ${result.error}`)
        }
      } catch (error) {
        if (!mounted) return
        
        console.error('PDF worker initialization error:', error)
        setWorkerStatus("Initialization error")
        setError("Failed to initialize PDF worker. Please try refreshing the page.")
      }
    }

    initializeWorker()

    return () => {
      mounted = false
      timeout.stopTimeout()
    }
    // Note: 'timeout' is intentionally not in dependencies to prevent infinite loop
    // timeout functions are stable due to useCallback in usePDFTimeout hook
  }, [retryCount]) // Re-run when retryCount changes

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    const loadTime = performance.now() - (timeout.startTime || 0)
    
    setNumPages(numPages)
    setIsLoading(false)
    setError("")
    timeout.stopTimeout() // Stop timeout monitoring on success
    
    // Log successful PDF load
    pdfAnalytics.logPDFLoad(loadTime, numPages, true)
    console.log('✅ PDF loaded successfully, timeout monitoring stopped')
  }, [timeout])

  const onDocumentLoadError = useCallback(async (error: Error) => {
    const loadTime = performance.now() - (timeout.startTime || 0)
    
    console.error("PDF loading error:", error)
    timeout.stopTimeout() // Stop timeout monitoring on error
    
    // Log PDF load error
    pdfAnalytics.logPDFLoad(loadTime, 0, false, error.message)
    
    // Check if this is a worker-related error and try to reinitialize
    if ((error.message.includes('worker') || error.message.includes('Worker')) && pdfWorkerManager) {
      console.log('🔄 Worker-related error detected, attempting reinitalization...')
      
      try {
        const result = await pdfWorkerManager.reinitialize()
        if (result.success) {
          setWorkerStatus(`Reinitialized (${result.source})`)
          setError("Worker was reinitialized. Please try loading the PDF again.")
          return
        }
      } catch (reinitError) {
        console.error('Reinitialization failed:', reinitError)
      }
    }
    
    // More specific error messages
    let errorMessage = "Failed to load PDF. "
    if (error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
      errorMessage += "The PDF file appears to be corrupted or invalid."
    } else if (error.message.includes('worker') || error.message.includes('Worker')) {
      errorMessage += "PDF worker initialization failed. Try clicking 'Retry' or refresh the page."
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      errorMessage += "Network error loading PDF. Please check your connection."
    } else {
      errorMessage += "Please ensure the file is a valid PDF document and try again."
    }
    
    setError(errorMessage)
    setIsLoading(false)
  }, [timeout, pdfWorkerManager])

  // Monitor timeout/stuck states and auto-abort if needed
  useEffect(() => {
    if (timeout.shouldAbort && !abortAttempted && renderMode === 'react-pdf') {
      console.log('⏰ Timeout detected, falling back to iframe...')
      setAbortAttempted(true)
      setIsLoading(false)
      
      // Log timeout and fallback
      pdfAnalytics.logTimeout(timeout.timeElapsed, timeout.isTimeout ? 'absolute timeout' : 'stuck timeout')
      pdfAnalytics.logRenderModeChange('react-pdf', 'iframe', 'timeout fallback')
      
      // Progressive fallback: react-pdf → iframe → download
      setRenderMode('iframe')
      setError("")
      setWorkerStatus("Switching to browser PDF viewer...")
      timeout.stopTimeout()
    }
  }, [timeout.shouldAbort, timeout.isTimeout, timeout.isStuck, abortAttempted, timeout, renderMode])

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2))
  }

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const downloadPDF = () => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRetry = async () => {
    console.log('🔄 Manual retry initiated...')
    setRetryCount(prev => prev + 1)
    setError("")
    setIsLoading(true)
    setAbortAttempted(false)
    
    // Reset timeout state
    timeout.reset()
    
    // Reset to react-pdf mode first
    setRenderMode('react-pdf')
    setWorkerStatus("Retrying with react-pdf...")
    
    // Reinitialize worker if available
    if (pdfWorkerManager) {
      try {
        const result = await pdfWorkerManager.reinitialize()
        if (result.success) {
          setWorkerStatus(`Reinitialized (${result.source})`)
        }
      } catch (error) {
        console.error('Manual retry failed:', error)
      }
    }
  }

  const switchToIframe = () => {
    console.log('🔄 Switching to iframe mode...')
    pdfAnalytics.logRenderModeChange(renderMode, 'iframe', 'manual switch')
    setRenderMode('iframe')
    setError("")
    setIsLoading(false)
    setWorkerStatus("Using browser PDF viewer")
    timeout.stopTimeout()
  }

  const switchToDownloadOnly = () => {
    console.log('🔄 Switching to download-only mode...')
    pdfAnalytics.logRenderModeChange(renderMode, 'download-only', 'iframe failed')
    setRenderMode('download-only')
    setError("")
    setIsLoading(false)
    setWorkerStatus("Download required")
    timeout.stopTimeout()
  }

  const handleAbort = () => {
    console.log('🛑 Manual abort initiated...')
    timeout.forceAbort()
    setIsLoading(false)
    setError("PDF loading was manually aborted. You can try again or download the file directly.")
  }

  if (error && renderMode === 'react-pdf') {
    return (
      <div className={cn("flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg", className)}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-heading-sm text-gray-900 dark:text-gray-100 mb-2">
            PDF Loading Error
          </h3>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-caption text-gray-500 dark:text-gray-400">
              Worker Status: {workerStatus}
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={switchToIframe}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Eye className="h-4 w-4" />
                Browser View
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render mode: download-only
  if (renderMode === 'download-only') {
    return (
      <div className={cn("flex items-center justify-center h-96 bg-white dark:bg-black rounded-lg", className)}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="h-8 w-8 text-black dark:text-white" />
          </div>
          <h3 className="text-heading-sm text-black dark:text-white mb-2">
            Download Required
          </h3>
          <p className="text-body-sm text-gray-600 dark:text-gray-400 mb-4">
            This PDF cannot be displayed in the browser. Please download it to view.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-body-sm"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-400 text-white dark:text-black rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors text-body-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render mode: iframe
  if (renderMode === 'iframe') {
    return (
      <div className={cn("flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", className)}>
        {/* Controls */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-gray-700 dark:text-gray-300">
              Browser PDF Viewer
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-caption text-gray-500 dark:text-gray-400" title={workerStatus}>
              🌐
            </div>
            
            <button
              onClick={() => {
                pdfAnalytics.logRenderModeChange(renderMode, 'react-pdf', 'manual switch')
                setRenderMode('react-pdf')
                setIsLoading(true)
                setWorkerStatus("Switching to enhanced viewer...")
              }}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Switch to enhanced viewer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={downloadPDF}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={switchToDownloadOnly}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500"
              title="This doesn't work either"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Iframe PDF Viewer */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
              onError={() => {
                console.error('Iframe PDF loading failed')
                switchToDownloadOnly()
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", className)}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          {/* Render Mode Indicator */}
          <div className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
            Enhanced View
          </div>
          
          {/* Page Navigation */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || isLoading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-body-sm text-gray-700 dark:text-gray-300 px-2">
            {isLoading ? "Loading..." : `${pageNumber} / ${numPages}`}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Worker Status Indicator */}
          <div className="text-caption text-gray-500 dark:text-gray-400 mr-2" title={workerStatus}>
            {workerStatus.includes('Ready') ? '🟢' : workerStatus.includes('failed') ? '🔴' : '🟡'}
          </div>

          {/* Timeout Status Indicator (only show during loading) */}
          {isLoading && timeout.timeElapsed > 0 && (
            <div className="flex items-center gap-1 text-caption text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{Math.round(timeout.timeElapsed / 1000)}s</span>
              {timeout.isStuck && <span className="text-amber-500">⚠️ Stuck</span>}
              {timeout.getTimeRemaining() < 10000 && (
                <span className="text-red-500">⏰ {Math.round(timeout.getTimeRemaining() / 1000)}s left</span>
              )}
            </div>
          )}

          {/* Abort Button (only show during loading) */}
          {isLoading && !error && (
            <button
              onClick={handleAbort}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-500"
              title="Stop loading PDF"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          )}

          {/* Zoom Controls */}
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5 || isLoading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-body-sm text-gray-700 dark:text-gray-300 px-2 min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0 || isLoading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Rotate */}
          <button
            onClick={rotate}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Rotate 90°"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Retry */}
          <button
            onClick={handleRetry}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Retry loading PDF"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Fallback Options */}
          {!isLoading && (
            <button
              onClick={switchToIframe}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-blue-600"
              title="Switch to browser PDF viewer"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {/* Analytics Export (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => pdfAnalytics.exportAnalytics()}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-purple-600"
              title="Export analytics data"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          )}

          {/* Download */}
          <button
            onClick={downloadPDF}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
        <div className="flex justify-center">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-body-sm text-gray-600 dark:text-gray-400">Loading PDF...</p>
                  <p className="text-caption text-gray-500 dark:text-gray-400 mt-1">
                    Worker: {workerStatus}
                  </p>
                  {timeout.timeElapsed > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-caption text-gray-500 dark:text-gray-400">
                        Time elapsed: {Math.round(timeout.timeElapsed / 1000)}s
                      </p>
                      <p className="text-caption text-gray-500 dark:text-gray-400">
                        {timeout.getStatusMessage()}
                      </p>
                      {timeout.isStuck && (
                        <p className="text-caption text-amber-600 dark:text-amber-400">
                          ⚠️ Loading appears stuck - consider aborting
                        </p>
                      )}
                      {timeout.getTimeRemaining() < 10000 && (
                        <p className="text-caption text-red-600 dark:text-red-400">
                          ⏰ Timeout in {Math.round(timeout.getTimeRemaining() / 1000)}s
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96">
                <div className="text-center max-w-md px-6">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-heading-sm text-gray-900 dark:text-gray-100 mb-2">
                    Unable to load PDF
                  </h3>
                  <p className="text-body-sm text-gray-600 dark:text-gray-400 mb-2">
                    The PDF file could not be loaded. This might be a worker issue.
                  </p>
                  <p className="text-caption text-gray-500 dark:text-gray-400 mb-4">
                    Worker Status: {workerStatus}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-body-sm hover:bg-indigo-700"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded text-body-sm hover:bg-gray-700"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            }
          >
            {/* Continuous scroll: render all pages */}
            <div className="space-y-4">
              {Array.from(new Array(numPages), (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="border border-gray-300 dark:border-gray-600 shadow-lg"
                />
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  )
}