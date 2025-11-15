"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { ToastProvider } from "@/components/ToastContainer"
import KeyboardShortcutsModal, { useKeyboardShortcuts } from "@/components/KeyboardShortcuts"
import QuickActionButton from "@/components/QuickActionButton"
import AccentColorInitializer from "@/components/AccentColorInitializer"
import { useUIStore } from "@/lib/store/useStore"

// Dynamic import to prevent SSR issues with PDF.js
const PDFWorkerInitializer = dynamic(() => import("@/components/PDFWorkerInitializer"), {
  ssr: false
})

function ClientWrapperContent({ children }: { children: React.ReactNode }) {
  const shortcuts = useKeyboardShortcuts()
  const pathname = usePathname()
  const { activeMode } = useUIStore()

  // Only show QuickActionButton on dashboard pages, but hide in chat mode
  const showQuickAction = pathname?.startsWith('/dashboard') && activeMode !== 'chat'

  return (
    <>
      <AccentColorInitializer />
      <PDFWorkerInitializer />
      {children}
      {showQuickAction && <QuickActionButton className="hidden lg:block" />}
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