"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { ToastProvider } from "@/components/ToastContainer"
import KeyboardShortcutsModal, { useKeyboardShortcuts } from "@/components/KeyboardShortcuts"
import AccentColorInitializer from "@/components/AccentColorInitializer"

// Dynamic import to prevent SSR issues with PDF.js
const PDFWorkerInitializer = dynamic(() => import("@/components/PDFWorkerInitializer"), {
  ssr: false
})

function ClientWrapperContent({ children }: { children: React.ReactNode }) {
  const shortcuts = useKeyboardShortcuts()

  return (
    <>
      <AccentColorInitializer />
      <PDFWorkerInitializer />
      {children}
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