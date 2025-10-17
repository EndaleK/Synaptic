"use client"

import dynamic from "next/dynamic"
import { ToastProvider } from "@/components/ToastContainer"
import KeyboardShortcutsModal, { useKeyboardShortcuts } from "@/components/KeyboardShortcuts"
import QuickActionButton from "@/components/QuickActionButton"

// Dynamic import to prevent SSR issues with PDF.js
const PDFWorkerInitializer = dynamic(() => import("@/components/PDFWorkerInitializer"), {
  ssr: false
})

function ClientWrapperContent({ children }: { children: React.ReactNode }) {
  const shortcuts = useKeyboardShortcuts()

  return (
    <>
      <PDFWorkerInitializer />
      {children}
      <QuickActionButton />
      <KeyboardShortcutsModal isOpen={shortcuts.isOpen} onClose={shortcuts.close} />
    </>
  )
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ClientWrapperContent>{children}</ClientWrapperContent>
    </ToastProvider>
  )
}