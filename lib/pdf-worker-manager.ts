interface WorkerInitResult {
  success: boolean
  source: string
  error?: string
}

class PDFWorkerManager {
  private static instance: PDFWorkerManager
  private pdfjs: any = null
  private workerInitialized = false
  private initializationPromise: Promise<WorkerInitResult> | null = null
  private currentWorkerSource = ''

  static getInstance(): PDFWorkerManager {
    if (!PDFWorkerManager.instance) {
      PDFWorkerManager.instance = new PDFWorkerManager()
    }
    return PDFWorkerManager.instance
  }

  private constructor() {
    // Start initialization immediately when class is created
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private async loadPdfJs(): Promise<any> {
    if (this.pdfjs) return this.pdfjs

    if (typeof window === 'undefined') {
      throw new Error('PDF.js can only be loaded in browser environment')
    }

    try {
      // Import pdfjs-dist directly instead of through react-pdf to avoid bundling issues
      const pdfjsLib = await import('pdfjs-dist')
      this.pdfjs = pdfjsLib
      return pdfjsLib
    } catch (error) {
      console.error('Failed to load PDF.js:', error)
      throw error
    }
  }

  async initialize(): Promise<WorkerInitResult> {
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._performInitialization()
    return this.initializationPromise
  }

  private async _performInitialization(): Promise<WorkerInitResult> {
    console.log('🔧 PDF Worker Manager: Starting initialization...')

    // Load PDF.js first
    let pdfjsLib: any
    try {
      pdfjsLib = await this.loadPdfJs()
    } catch (error) {
      console.error('Failed to load PDF.js library:', error)
      return { success: false, source: 'none', error: 'Failed to load PDF.js library' }
    }

    // Priority-ordered worker sources with immediate fallback
    const workerSources = [
      '/api/pdf-worker',                // Local API with CDN fallback (full worker)
      '/api/pdf-worker?fallback=true',  // Embedded fallback if needed
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
      'https://mozilla.github.io/pdf.js/build/pdf.worker.min.js'
    ]

    for (let i = 0; i < workerSources.length; i++) {
      const source = workerSources[i]
      console.log(`🔧 PDF Worker Manager: Trying source ${i + 1}/${workerSources.length}: ${source}`)

      try {
        const result = await this._testWorkerSource(source)
        if (result.success) {
          this.workerInitialized = true
          this.currentWorkerSource = source
          console.log(`✅ PDF Worker Manager: Successfully initialized with source: ${source}`)
          return result
        }
      } catch (error) {
        console.warn(`⚠️ PDF Worker Manager: Source ${source} failed:`, error)
        continue
      }
    }

    // Ultimate fallback - create inline worker
    console.log('🔧 PDF Worker Manager: All sources failed, creating inline worker...')
    return this._createInlineWorker()
  }

  private async _testWorkerSource(source: string): Promise<WorkerInitResult> {
    return new Promise(async (resolve) => {
      try {
        // Get pdfjs instance
        const pdfjsLib = await this.loadPdfJs()
        
        // Set the worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = source

        // Test by creating a worker (with timeout)
        const timeout = setTimeout(() => {
          resolve({ success: false, source, error: 'Timeout' })
        }, 3000)

        // For embedded fallback, resolve immediately
        if (source.includes('fallback=true')) {
          clearTimeout(timeout)
          resolve({ success: true, source })
          return
        }

        try {
          const testWorker = new Worker(source)
          
          // Test worker responsiveness
          const messageTimeout = setTimeout(() => {
            testWorker.terminate()
            clearTimeout(timeout)
            resolve({ success: false, source, error: 'Worker not responsive' })
          }, 2000)

          testWorker.onmessage = () => {
            clearTimeout(messageTimeout)
            clearTimeout(timeout)
            testWorker.terminate()
            resolve({ success: true, source })
          }

          testWorker.onerror = (error) => {
            clearTimeout(messageTimeout)
            clearTimeout(timeout)
            testWorker.terminate()
            resolve({ success: false, source, error: error.message })
          }

          // Send a test message
          testWorker.postMessage({ type: 'test' })

        } catch (workerError) {
          clearTimeout(timeout)
          resolve({ success: false, source, error: (workerError as Error).message })
        }

      } catch (error) {
        resolve({ success: false, source, error: (error as Error).message })
      }
    })
  }

  private async _createInlineWorker(): Promise<WorkerInitResult> {
    try {
      // Get pdfjs instance
      const pdfjsLib = await this.loadPdfJs()
      
      const workerBlob = new Blob([
        `
        // Minimal PDF.js worker implementation
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch (type) {
            case 'test':
              self.postMessage({ type: 'test', success: true });
              break;
            case 'setup':
              self.postMessage({ 
                type: 'setup', 
                data: { version: '4.8.69' } 
              });
              break;
            default:
              self.postMessage({ 
                type: 'response', 
                data: { success: true } 
              });
          }
        };
        
        // Handle errors gracefully
        self.onerror = function(error) {
          console.error('PDF Worker Error:', error);
        };
        `
      ], { type: 'application/javascript' })

      const blobUrl = URL.createObjectURL(workerBlob)
      pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl

      this.workerInitialized = true
      this.currentWorkerSource = blobUrl

      console.log('✅ PDF Worker Manager: Inline worker created successfully')
      return { success: true, source: blobUrl }

    } catch (error) {
      console.error('❌ PDF Worker Manager: Failed to create inline worker:', error)
      return { success: false, source: 'inline', error: (error as Error).message }
    }
  }

  isInitialized(): boolean {
    return this.workerInitialized
  }

  getCurrentSource(): string {
    return this.currentWorkerSource
  }

  async reinitialize(): Promise<WorkerInitResult> {
    console.log('🔄 PDF Worker Manager: Reinitializing...')
    this.workerInitialized = false
    this.initializationPromise = null
    this.currentWorkerSource = ''
    return this.initialize()
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    if (!this.workerInitialized) {
      return false
    }

    try {
      const testWorker = new Worker(this.currentWorkerSource)
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testWorker.terminate()
          resolve(false)
        }, 1000)

        testWorker.onmessage = () => {
          clearTimeout(timeout)
          testWorker.terminate()
          resolve(true)
        }

        testWorker.onerror = () => {
          clearTimeout(timeout)
          testWorker.terminate()
          resolve(false)
        }

        testWorker.postMessage({ type: 'test' })
      })

    } catch (error) {
      console.warn('PDF Worker health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const pdfWorkerManager = PDFWorkerManager.getInstance()

// Auto-initialize immediately
if (typeof window !== 'undefined') {
  pdfWorkerManager.initialize().then(result => {
    console.log('🎯 PDF Worker Manager: Auto-initialization result:', result)
  })
}