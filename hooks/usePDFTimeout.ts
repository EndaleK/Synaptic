import { useState, useEffect, useCallback, useRef } from 'react'

interface PDFTimeoutConfig {
  loadTimeout: number      // Maximum time to wait for PDF loading
  progressTimeout: number  // Time to wait between progress updates
  healthCheckInterval: number // Interval for health checks
}

interface PDFTimeoutState {
  isTimeout: boolean
  isStuck: boolean
  timeElapsed: number
  lastProgressTime: number
  shouldAbort: boolean
}

const DEFAULT_CONFIG: PDFTimeoutConfig = {
  loadTimeout: 120000,       // 120 seconds (2 minutes) max loading time for large PDFs
  progressTimeout: 30000,    // 30 seconds without progress = stuck
  healthCheckInterval: 1000  // Check every second
}

export function usePDFTimeout(config: Partial<PDFTimeoutConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [state, setState] = useState<PDFTimeoutState>({
    isTimeout: false,
    isStuck: false,
    timeElapsed: 0,
    lastProgressTime: 0,
    shouldAbort: false
  })

  const startTimeRef = useRef<number>(0)
  const lastProgressRef = useRef<number>(0)
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(false)

  // Start timeout monitoring
  const startTimeout = useCallback(() => {
    console.log('🕐 PDF Timeout: Starting monitoring...')
    
    const now = Date.now()
    startTimeRef.current = now
    lastProgressRef.current = now
    isActiveRef.current = true

    setState({
      isTimeout: false,
      isStuck: false,
      timeElapsed: 0,
      lastProgressTime: now,
      shouldAbort: false
    })

    // Set absolute timeout
    timeoutIdRef.current = setTimeout(() => {
      console.log('⏰ PDF Timeout: Maximum load time exceeded')
      setState(prev => ({ ...prev, isTimeout: true, shouldAbort: true }))
      isActiveRef.current = false
    }, finalConfig.loadTimeout)

    // Start progress monitoring
    intervalIdRef.current = setInterval(() => {
      if (!isActiveRef.current) return

      const now = Date.now()
      const elapsed = now - startTimeRef.current
      const timeSinceProgress = now - lastProgressRef.current

      setState(prev => ({
        ...prev,
        timeElapsed: elapsed,
        isStuck: timeSinceProgress > finalConfig.progressTimeout,
        shouldAbort: timeSinceProgress > finalConfig.progressTimeout
      }))

      // Log progress for debugging
      if (elapsed % 5000 === 0) { // Every 5 seconds
        console.log(`🕐 PDF Timeout: ${elapsed}ms elapsed, last progress: ${timeSinceProgress}ms ago`)
      }

    }, finalConfig.healthCheckInterval)

  }, [finalConfig])

  // Signal progress (reset stuck timer)
  const signalProgress = useCallback(() => {
    if (!isActiveRef.current) return
    
    const now = Date.now()
    lastProgressRef.current = now
    
    setState(prev => ({
      ...prev,
      lastProgressTime: now,
      isStuck: false
    }))

    console.log('📊 PDF Timeout: Progress signal received')
  }, [])

  // Stop timeout monitoring (success)
  const stopTimeout = useCallback(() => {
    console.log('✅ PDF Timeout: Stopping monitoring (success)')
    
    isActiveRef.current = false
    
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }

    setState({
      isTimeout: false,
      isStuck: false,
      timeElapsed: 0,
      lastProgressTime: 0,
      shouldAbort: false
    })
  }, [])

  // Force abort
  const forceAbort = useCallback(() => {
    console.log('🛑 PDF Timeout: Force abort triggered')
    
    setState(prev => ({ ...prev, shouldAbort: true }))
    stopTimeout()
  }, [stopTimeout])

  // Reset state
  const reset = useCallback(() => {
    console.log('🔄 PDF Timeout: Resetting state')
    stopTimeout()
  }, [stopTimeout])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
      if (intervalIdRef.current) clearInterval(intervalIdRef.current)
    }
  }, [])

  // Helper functions
  const getTimeRemaining = () => {
    const remaining = finalConfig.loadTimeout - state.timeElapsed
    return Math.max(0, remaining)
  }

  const getProgressPercent = () => {
    return Math.min(100, (state.timeElapsed / finalConfig.loadTimeout) * 100)
  }

  const getStatusMessage = () => {
    if (state.isTimeout) return 'Loading timeout exceeded'
    if (state.isStuck) return 'Loading appears to be stuck'
    if (state.timeElapsed > finalConfig.loadTimeout * 0.8) return 'Loading is taking longer than expected'
    return 'Loading in progress'
  }

  return {
    // State
    ...state,
    
    // Actions
    startTimeout,
    stopTimeout,
    signalProgress,
    forceAbort,
    reset,
    
    // Utilities
    getTimeRemaining,
    getProgressPercent,
    getStatusMessage,
    
    // Config
    config: finalConfig
  }
}