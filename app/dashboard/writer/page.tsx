"use client"

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import WritingView from '@/components/WritingView'

function WriterPageContent() {
  const searchParams = useSearchParams()
  const essayId = searchParams.get('essayId') || undefined
  const documentId = searchParams.get('documentId') || undefined

  return <WritingView essayId={essayId} documentId={documentId} />
}

export default function WriterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading writing editor...</p>
        </div>
      </div>
    }>
      <WriterPageContent />
    </Suspense>
  )
}
