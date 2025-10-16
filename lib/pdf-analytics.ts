interface PDFAnalyticsEvent {
  timestamp: number
  event: string
  data: Record<string, any>
  sessionId: string
}

interface PDFPerformanceMetrics {
  workerInitTime?: number
  pdfLoadTime?: number
  renderTime?: number
  totalTime?: number
  fileSize?: number
  numPages?: number
  renderMode: 'react-pdf' | 'iframe' | 'download-only'
  workerSource?: string
  errors: string[]
  fallbacks: string[]
}

class PDFAnalytics {
  private static instance: PDFAnalytics
  private sessionId: string
  private events: PDFAnalyticsEvent[] = []
  private currentSession: PDFPerformanceMetrics | null = null
  private startTime: number = 0

  private constructor() {
    this.sessionId = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getInstance(): PDFAnalytics {
    if (!PDFAnalytics.instance) {
      PDFAnalytics.instance = new PDFAnalytics()
    }
    return PDFAnalytics.instance
  }

  startSession(fileSize: number, fileName: string) {
    this.startTime = performance.now()
    this.currentSession = {
      renderMode: 'react-pdf',
      fileSize,
      errors: [],
      fallbacks: []
    }
    
    this.logEvent('session_start', {
      fileName,
      fileSize,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    })
  }

  logWorkerInit(source: string, initTime: number, success: boolean) {
    if (this.currentSession) {
      this.currentSession.workerInitTime = initTime
      this.currentSession.workerSource = source
    }

    this.logEvent('worker_init', {
      source,
      initTime,
      success,
      timestamp: Date.now()
    })
  }

  logPDFLoad(loadTime: number, numPages: number, success: boolean, error?: string) {
    if (this.currentSession) {
      this.currentSession.pdfLoadTime = loadTime
      this.currentSession.numPages = numPages
      if (error) {
        this.currentSession.errors.push(error)
      }
    }

    this.logEvent('pdf_load', {
      loadTime,
      numPages,
      success,
      error,
      timestamp: Date.now()
    })
  }

  logRenderModeChange(fromMode: string, toMode: string, reason: string) {
    if (this.currentSession) {
      this.currentSession.renderMode = toMode as any
      this.currentSession.fallbacks.push(`${fromMode} → ${toMode}: ${reason}`)
    }

    this.logEvent('render_mode_change', {
      fromMode,
      toMode,
      reason,
      timestamp: Date.now()
    })
  }

  logTimeout(timeElapsed: number, reason: string) {
    if (this.currentSession) {
      this.currentSession.errors.push(`Timeout after ${timeElapsed}ms: ${reason}`)
    }

    this.logEvent('timeout', {
      timeElapsed,
      reason,
      timestamp: Date.now()
    })
  }

  logError(error: string, context: Record<string, any> = {}) {
    if (this.currentSession) {
      this.currentSession.errors.push(error)
    }

    this.logEvent('error', {
      error,
      context,
      timestamp: Date.now()
    })
  }

  endSession(success: boolean) {
    if (this.currentSession) {
      this.currentSession.totalTime = performance.now() - this.startTime
    }

    this.logEvent('session_end', {
      success,
      totalTime: this.currentSession?.totalTime,
      metrics: this.currentSession,
      timestamp: Date.now()
    })

    // Log summary to console for debugging
    console.log('📊 PDF Session Summary:', {
      sessionId: this.sessionId,
      success,
      metrics: this.currentSession,
      events: this.events.length
    })
  }

  private logEvent(event: string, data: Record<string, any>) {
    const analyticsEvent: PDFAnalyticsEvent = {
      timestamp: Date.now(),
      event,
      data,
      sessionId: this.sessionId
    }

    this.events.push(analyticsEvent)
    
    // Log to console in development
    console.log(`📊 PDF Analytics [${event}]:`, data)
    
    // Keep only last 100 events to prevent memory bloat
    if (this.events.length > 100) {
      this.events = this.events.slice(-100)
    }
  }

  // Get analytics data for export/debugging
  getAnalyticsData() {
    return {
      sessionId: this.sessionId,
      currentSession: this.currentSession,
      events: this.events,
      summary: this.generateSummary()
    }
  }

  private generateSummary() {
    const errorEvents = this.events.filter(e => e.event === 'error')
    const timeoutEvents = this.events.filter(e => e.event === 'timeout')
    const fallbackEvents = this.events.filter(e => e.event === 'render_mode_change')

    return {
      totalEvents: this.events.length,
      errors: errorEvents.length,
      timeouts: timeoutEvents.length,
      fallbacks: fallbackEvents.length,
      finalRenderMode: this.currentSession?.renderMode,
      totalTime: this.currentSession?.totalTime,
      success: this.currentSession?.errors.length === 0
    }
  }

  // Export analytics as JSON for external analysis
  exportAnalytics() {
    const data = this.getAnalyticsData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `pdf-analytics-${this.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export const pdfAnalytics = PDFAnalytics.getInstance()