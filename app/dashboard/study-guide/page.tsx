"use client"

import { useState } from "react"
import StudyGuideView from "@/components/StudyGuideView"
import InlineDocumentPicker from "@/components/InlineDocumentPicker"
import type { Document } from "@/lib/supabase/types"

export default function StudyGuidePage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {!selectedDocument ? (
        <InlineDocumentPicker
          onDocumentSelect={handleDocumentSelect}
          mode="studyguide"
        />
      ) : (
        <StudyGuideView
          documentId={selectedDocument.id}
          documentName={selectedDocument.file_name}
        />
      )}
    </div>
  )
}
