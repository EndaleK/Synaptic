"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { BookOpen, FileText, Menu, X, MessageSquare, Mic, Network, Moon, Sun, LogOut, Clock, PenTool, Youtube, GraduationCap } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useUIStore } from "@/lib/store/useStore"
import { useToast } from "@/components/ToastContainer"
import { SignOutButton } from "@clerk/nextjs"
import FloatingPomodoroTimer from "@/components/FloatingPomodoroTimer"
import FloatingStudyBuddy from "@/components/FloatingStudyBuddy"
import BottomNavigationBar from "@/components/BottomNavigationBar"
import RoleSwitcher from "@/components/RoleSwitcher"
import { TourProvider } from "@/components/Tour/TourProvider"
import TourOverlay from "@/components/Tour/TourOverlay"
import { useStudySessionTracking } from "@/lib/hooks/useStudySessionTracking"
import { usePomodoroStore } from "@/lib/store/usePomodoroStore"
import StudyToolsTopBar from "@/components/StudyToolsTopBar"
import { StudyReminderPopup } from "@/components/StudyReminderPopup"
import { useStudyReminders } from "@/lib/hooks/useStudyReminders"
import { useStudyBuddyStore } from "@/lib/store/useStudyBuddyStore"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user} = useUser()
  const toast = useToast()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { activeMode, setActiveMode } = useUIStore()
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Pomodoro timer state
  const { status: pomodoroStatus, timeRemaining, timerType, startTimer } = usePomodoroStore()

  // Study Buddy state for reminder actions
  const { setViewMode, updateLastActivity } = useStudyBuddyStore()

  // Study reminders hook
  const {
    currentReminder,
    dismissReminder,
    snoozeReminder
  } = useStudyReminders({
    enabled: true,
    onReminderTriggered: () => {
      // Could add analytics tracking here
    }
  })

  // Fix hydration mismatch by only rendering client-only elements after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Helper function to format timer display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-track study sessions for all dashboard activity
  useStudySessionTracking({
    autoStart: true,
    inactivityTimeout: 2 * 60 * 1000, // 2 minutes (matches hook default)
    minSessionDuration: 0.25 // 15 seconds minimum (matches hook default)
  })

  const isDarkMode = resolvedTheme === 'dark'

  // Handle reminder primary actions
  const handleReminderAction = (action: string) => {
    updateLastActivity()

    switch (action) {
      case 'review':
        setActiveMode('flashcards')
        if (pathname !== '/dashboard') {
          router.push('/dashboard')
        }
        break
      case 'open_study_buddy':
        setViewMode('floating')
        break
      case 'continue':
        setViewMode('floating')
        break
      case 'break':
        // Could trigger a break timer here
        toast.info('Taking a 5-minute break. You\'ve earned it!')
        break
      case 'dismiss':
      default:
        break
    }
  }

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark'
    setTheme(newTheme)
    toast.success(`Switched to ${newTheme} mode`)
  }

  const learningModes = [
    { name: "Documents", href: "/dashboard/documents", icon: FileText, comingSoon: false },
    // Study Buddy is now merged into Chat - removed from sidebar
    { name: "Chat", id: "chat", icon: MessageSquare, comingSoon: false },
    { name: "Flashcards", id: "flashcards", icon: BookOpen, comingSoon: false },
    { name: "Podcast", id: "podcast", icon: Mic, comingSoon: false },
    { name: "Mind Map", id: "mindmap", icon: Network, comingSoon: false },
    { name: "Mock Exams", id: "exam", icon: GraduationCap, comingSoon: false },
    { name: "Write", id: "writer", icon: PenTool, comingSoon: false },
    { name: "Video", id: "video", icon: Youtube, comingSoon: false },
    { name: "Quick Summary", id: "quick-summary", icon: Clock, comingSoon: false },
  ]

  const handleModeClick = (modeId: string, comingSoon: boolean) => {
    if (comingSoon) {
      toast.info('This mode is coming soon! Stay tuned.')
      return
    }

    // Special handling for Writer mode - redirect to dedicated page
    if (modeId === 'writer') {
      router.push('/dashboard/writer')
      setSidebarOpen(false)
      return
    }

    setActiveMode(modeId as any)
    setSidebarOpen(false)
    // Navigate to dashboard if not already there
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    }
  }

  // Swipe-to-close gesture handlers
  const minSwipeDistance = 50 // minimum distance for swipe to register

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance

    // Close sidebar on left swipe
    if (isLeftSwipe && sidebarOpen) {
      setSidebarOpen(false)
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  return (
    <TourProvider>
    <div className="min-h-screen bg-white dark:bg-[#0F0F0F]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile only (desktop uses top bar navigation) */}
      <aside
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`fixed top-0 left-0 z-50 h-full bg-white dark:bg-[#0F0F0F] transform transition-all duration-300 ease-in-out pl-[env(safe-area-inset-left)] lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-full sm:max-w-xs`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <Link
              href="/dashboard"
              onClick={() => {
                setSidebarOpen(false)
                setActiveMode("home")
              }}
              className="flex items-center gap-3"
            >
              <Image
                src="/logo-brain-transparent.png"
                alt="Synaptic Logo"
                width={40}
                height={40}
                className="w-10 h-10"
                priority
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 dark:from-violet-400 dark:to-pink-400">
                  Synaptic
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Study Smarter
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Learning Modes Section */}
            <div className="space-y-1">
              {learningModes.map((mode) => {
                const isActive = mode.href
                  ? pathname === mode.href
                  : pathname === "/dashboard" && activeMode === mode.id

                if (mode.href) {
                  return (
                    <Link
                      key={mode.name}
                      href={mode.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <mode.icon className="w-5 h-5" />
                      <span>{mode.name}</span>
                    </Link>
                  )
                }

                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeClick(mode.id!, mode.comingSoon)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                      isActive
                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                        : mode.comingSoon
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <mode.icon className="w-5 h-5" />
                    <span className="flex-1">{mode.name}</span>
                    {mode.comingSoon && (
                      <span className="px-2 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 rounded-full">
                        Soon
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            {/* Role Switcher */}
            <RoleSwitcher collapsed={false} />

            {/* Theme Toggle & Sign Out */}
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all text-sm font-medium"
              >
                {isMounted && isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{isMounted && isDarkMode ? "Light" : "Dark"}</span>
              </button>

              <SignOutButton>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all text-sm font-medium">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </SignOutButton>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
              {isMounted && <UserButton />}
              {isMounted && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.fullName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content - No sidebar padding on desktop */}
      <div className="transition-all duration-300">
        {/* Desktop Study Tools Top Bar */}
        <StudyToolsTopBar />

        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-[#0F0F0F] border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-touch-icon text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo-brain-transparent.png"
                alt="Synaptic"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
              <span className="font-bold text-black dark:text-white">
                Synaptic
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="btn-touch-icon text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                title={isMounted && isDarkMode ? "Light mode" : "Dark mode"}
              >
                {isMounted && isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {isMounted && <UserButton />}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pb-16 md:pb-0">{children}</main>

        {/* Floating Pomodoro Timer - Only for mobile (desktop has top bar timer) */}
        <div className="lg:hidden">
          <FloatingPomodoroTimer />
        </div>

        {/* Floating Study Buddy - Accessible from all learning modes */}
        <FloatingStudyBuddy />

        {/* Study Reminder Popup */}
        {isMounted && (
          <StudyReminderPopup
            reminder={currentReminder}
            onPrimaryAction={handleReminderAction}
            onDismiss={dismissReminder}
            onSnooze={snoozeReminder}
          />
        )}

        {/* Bottom Navigation Bar - Mobile Only */}
        <BottomNavigationBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isMenuOpen={sidebarOpen}
        />
      </div>

      {/* Feature Tour Overlay */}
      <TourOverlay />
    </div>
    </TourProvider>
  )
}
