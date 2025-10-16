"use client"

import dynamic from "next/dynamic"

// Dynamic import to prevent SSR issues with PDF.js
const PDFWorkerInitializer = dynamic(() => import("@/components/PDFWorkerInitializer"), {
  ssr: false
})

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PDFWorkerInitializer />
      {children}
    </>
  )
}