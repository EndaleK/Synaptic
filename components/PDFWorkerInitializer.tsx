"use client"

import { useEffect, useState } from 'react'

export default function PDFWorkerInitializer() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set client flag after hydration
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      // The pdf-worker-manager auto-initializes, but we can ensure it's ready
      import('@/lib/pdf-worker-manager').then(({ pdfWorkerManager }) => {
        // Just ensure it's initialized - don't override worker setup
        pdfWorkerManager.initialize().then(result => {
          console.log('PDF Worker initialized from PDFWorkerInitializer:', result)
        })
      }).catch(error => {
        console.error('Failed to load PDF worker manager:', error)
      })
    }
  }, [isClient])

  // This component doesn't render anything
  return null
}