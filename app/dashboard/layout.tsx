"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { BookOpen, Home, Settings, FileText, Menu, X, MessageSquare, Mic, Network, ChevronLeft, ChevronRight, Moon, Sun, LogOut, Calendar, Clock, BarChart3, Bell, ChevronDown, ChevronUp, PenTool, Youtube, Library, GraduationCap, Sparkles, BookOpenCheck } from "lucide-react"
import { useState, useEffect } from "react"
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user} = useUser()
  const toast = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [learningModesExpanded, setLearningModesExpanded] = useState(true)
  const [studyToolsExpanded, setStudyToolsExpanded] = useState(true)
  const { activeMode, setActiveMode } = useUIStore()
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Pomodoro timer state
  const { status: pomodoroStatus, timeRemaining, timerType, startTimer } = usePomodoroStore()

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

  // Initialize theme from localStorage (defaults to light mode)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    // Only use dark mode if explicitly set by user (ignore system preference)
    const shouldBeDark = savedTheme === 'dark'
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Load learning modes expanded state
    const savedLearningModesState = localStorage.getItem('learningModesExpanded')
    if (savedLearningModesState !== null) {
      setLearningModesExpanded(savedLearningModesState === 'true')
    }

    // Load study tools expanded state
    const savedStudyToolsState = localStorage.getItem('studyToolsExpanded')
    if (savedStudyToolsState !== null) {
      setStudyToolsExpanded(savedStudyToolsState === 'true')
    }
  }, [])

  // Save learning modes expanded state
  useEffect(() => {
    localStorage.setItem('learningModesExpanded', learningModesExpanded.toString())
  }, [learningModesExpanded])

  // Save study tools expanded state
  useEffect(() => {
    localStorage.setItem('studyToolsExpanded', studyToolsExpanded.toString())
  }, [studyToolsExpanded])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      toast.success('Switched to dark mode')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      toast.success('Switched to light mode')
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Documents", href: "/dashboard/documents", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  const learningModes = [
    { name: "Study Buddy", id: "studyBuddy", icon: Sparkles, comingSoon: false, isNew: true },
    { name: "Flashcards", id: "flashcards", icon: BookOpen, comingSoon: false },
    { name: "Chat", id: "chat", icon: MessageSquare, comingSoon: false },
    { name: "Podcast", id: "podcast", icon: Mic, comingSoon: false },
    { name: "Mind Map", id: "mindmap", icon: Network, comingSoon: false },
    { name: "Mock Exams", id: "exam", icon: GraduationCap, comingSoon: false },
    { name: "Write", id: "writer", icon: PenTool, comingSoon: false },
    { name: "Video", id: "video", icon: Youtube, comingSoon: false },
    { name: "Quick Summary", id: "quick-summary", icon: Clock, comingSoon: false, isNew: true },
  ]

  const studyTools = [
    { name: "Library", href: "/dashboard/library", icon: Library },
    { name: "Study Guide", href: "/dashboard/study-guide", icon: BookOpenCheck },
    { name: "Calendar", href: "/dashboard/study/calendar", icon: Calendar },
    { name: "Statistics", href: "/dashboard/study/statistics", icon: BarChart3 },
    { name: "Notifications", href: "/dashboard/study/settings", icon: Bell },
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
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0F172A]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`fixed top-0 left-0 z-50 h-full bg-[#F8F7FF] dark:bg-[#1A1625] border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out pl-[env(safe-area-inset-left)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "lg:w-20" : "w-full sm:max-w-xs lg:w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              {!sidebarCollapsed ? (
                <>
                  <div className="w-[46px] h-[46px] flex items-center justify-center flex-shrink-0">
                    <Image
                      src="/logo-brain-transparent.png"
                      alt="Synaptic Logo"
                      width={46}
                      height={46}
                      className="w-[46px] h-[46px]"
                      priority
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                      Synaptic
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Study Smarter
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-[46px] h-[46px] flex items-center justify-center">
                  <Image
                    src="/logo-brain-transparent.png"
                    alt="Synaptic Logo"
                    width={46}
                    height={46}
                    className="w-[46px] h-[46px]"
                    priority
                  />
                </div>
              )}
            </Link>
            {/* Collapse button - desktop only */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex btn-touch-icon text-gray-600 dark:text-gray-400 hover:text-accent-primary rounded-lg hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-0.5">
              {navigation.map((item) => {
                const isActive = item.href === "/dashboard"
                  ? pathname === item.href && activeMode === "home"
                  : pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setSidebarOpen(false)
                      if (item.href === "/dashboard") {
                        setActiveMode("home")
                      }
                    }}
                    data-tour={item.name === "Documents" ? "documents" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                        : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                    } ${sidebarCollapsed ? "justify-center" : ""}`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-4 h-4" />
                    {!sidebarCollapsed && item.name}
                  </Link>
                )
              })}
            </div>

            {/* Learning Modes Section */}
            <div>
              {!sidebarCollapsed ? (
                // Full sidebar - collapsible section
                <>
                  <button
                    onClick={() => setLearningModesExpanded(!learningModesExpanded)}
                    className="w-full px-3 mb-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-px flex-1 bg-gradient-to-r from-accent-primary/20 to-transparent"></div>
                      <div className="flex items-center gap-1">
                        <h3 className="text-[11.5px] font-semibold text-accent-primary uppercase tracking-wider">
                          Learning Modes
                        </h3>
                        {learningModesExpanded ? (
                          <ChevronUp className="w-2.5 h-2.5 text-accent-primary" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5 text-accent-primary" />
                        )}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-accent-primary/20 to-transparent"></div>
                    </div>
                  </button>

                  {learningModesExpanded && (
                    <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      {learningModes.map((mode) => {
                        const isActive = pathname === "/dashboard" && activeMode === mode.id
                        return (
                          <button
                            key={mode.id}
                            onClick={() => handleModeClick(mode.id, mode.comingSoon)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all text-left ${
                              isActive
                                ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                                : mode.comingSoon
                                ? "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                                : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                            }`}
                          >
                            <mode.icon className="w-4 h-4" />
                            <span className="flex-1">{mode.name}</span>
                            {mode.comingSoon && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-gray-300 dark:bg-gray-700 rounded-full">
                                Soon
                              </span>
                            )}
                            {mode.isNew && !mode.comingSoon && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                                NEW
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                // Collapsed sidebar - icon-only with tooltip
                <div className="space-y-0.5">
                  <div className="px-4 mb-2">
                    <div className="h-px bg-gradient-to-r from-accent-primary/20 to-transparent"></div>
                  </div>
                  {learningModes.map((mode) => {
                    const isActive = pathname === "/dashboard" && activeMode === mode.id
                    return (
                      <button
                        key={mode.id}
                        onClick={() => handleModeClick(mode.id, mode.comingSoon)}
                        className={`btn-touch-icon w-full rounded-lg font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                            : mode.comingSoon
                            ? "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                        }`}
                        title={mode.name}
                      >
                        <mode.icon className="w-5 h-5" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Study Tools & Scheduler Section */}
            <div data-tour="sidebar-tools">
              {!sidebarCollapsed ? (
                // Full sidebar - collapsible section
                <>
                  <button
                    onClick={() => setStudyToolsExpanded(!studyToolsExpanded)}
                    className="w-full px-3 mb-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="h-px flex-1 bg-gradient-to-r from-accent-primary/20 to-transparent"></div>
                      <div className="flex items-center gap-1">
                        <h3 className="text-[11.5px] font-semibold text-accent-primary uppercase tracking-wider">
                          Study Tools
                        </h3>
                        {studyToolsExpanded ? (
                          <ChevronUp className="w-2.5 h-2.5 text-accent-primary" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5 text-accent-primary" />
                        )}
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-accent-primary/20 to-transparent"></div>
                    </div>
                  </button>

                  {studyToolsExpanded && (
                    <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                      {studyTools.map((tool, index) => {
                        const isActive = pathname === tool.href
                        return (
                          <div key={tool.href}>
                            <Link
                              href={tool.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                                isActive
                                  ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                              }`}
                            >
                              <tool.icon className="w-4 h-4" />
                              <span className="flex-1">{tool.name}</span>
                            </Link>

                            {/* Pomodoro Timer - Show after Library */}
                            {tool.name === "Library" && (
                              <button
                                onClick={() => {
                                  if (pomodoroStatus === 'idle') {
                                    startTimer()
                                    toast.success('Pomodoro timer started!')
                                  }
                                  setSidebarOpen(false)
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                                  pomodoroStatus === 'running'
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30"
                                    : pomodoroStatus === 'paused'
                                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                                }`}
                              >
                                <Clock className="w-4 h-4" />
                                <span className="flex-1">Pomodoro</span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                // Collapsed sidebar - icon-only with tooltip
                <div className="space-y-0.5 mt-4">
                  <div className="px-4 mb-2">
                    <div className="h-px bg-gradient-to-r from-accent-primary/20 to-transparent"></div>
                  </div>
                  {studyTools.map((tool, index) => {
                    const isActive = pathname === tool.href
                    return (
                      <div key={tool.href}>
                        <Link
                          href={tool.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`btn-touch-icon rounded-lg font-medium transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                              : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                          }`}
                          title={tool.name}
                        >
                          <tool.icon className="w-5 h-5" />
                        </Link>

                        {/* Pomodoro Timer - Show after Library in collapsed mode */}
                        {tool.name === "Library" && (
                          <button
                            onClick={() => {
                              if (pomodoroStatus === 'idle') {
                                startTimer()
                                toast.success('Pomodoro timer started!')
                              }
                              setSidebarOpen(false)
                            }}
                            className={`btn-touch-icon rounded-lg font-medium transition-all ${
                              pomodoroStatus === 'running'
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30"
                                : pomodoroStatus === 'paused'
                                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30"
                                : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                            }`}
                            title="Pomodoro"
                          >
                            <Clock className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
            {/* Role Switcher - Only shows if user has multiple roles */}
            <RoleSwitcher collapsed={sidebarCollapsed} />

            {/* Theme Toggle & Sign Out Buttons */}
            <div className={`flex gap-1 ${sidebarCollapsed ? "flex-col" : ""}`}>
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 bg-accent-primary/10 dark:bg-accent-primary/20 hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 text-accent-primary rounded-lg transition-all text-[12px] font-medium border border-accent-primary/30 dark:border-accent-primary/50 ${
                  sidebarCollapsed ? "w-full" : "flex-1"
                }`}
                title={sidebarCollapsed ? (isDarkMode ? "Light mode" : "Dark mode") : undefined}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {!sidebarCollapsed && <span>{isDarkMode ? "Light" : "Dark"}</span>}
              </button>

              {/* Sign Out Button */}
              <SignOutButton>
                <button
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-all text-[12px] font-medium border border-red-200 dark:border-red-800 ${
                    sidebarCollapsed ? "w-full" : "flex-1"
                  }`}
                  title={sidebarCollapsed ? "Sign out" : undefined}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </button>
              </SignOutButton>
            </div>

            {/* User Info */}
            <div className={`flex items-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-lg border border-accent-primary/20 dark:border-accent-primary/50 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}>
              <div className="relative flex-shrink-0">
                {isMounted && <UserButton />}
                {isMounted && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                )}
              </div>
              {!sidebarCollapsed && isMounted && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-black dark:text-white truncate">
                    {user?.fullName || user?.username || "User"}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              )}
            </div>

            {/* Copyright Notice */}
            <div className={`px-2 py-0.5 text-center text-[10px] text-gray-500 dark:text-gray-400 ${
              sidebarCollapsed ? "text-center" : ""
            }`}>
              {sidebarCollapsed ? (
                <p>©</p>
              ) : (
                <p>© 2025 Synaptic. All rights reserved. ካንእ</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-[#FAFBFC]/80 dark:bg-[#0F172A]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 lg:hidden">
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
                title={isDarkMode ? "Light mode" : "Dark mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {isMounted && <UserButton />}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pb-16 md:pb-0">{children}</main>

        {/* Persistent Pomodoro Timer - Visible across all study tools */}
        <FloatingPomodoroTimer />

        {/* Floating Study Buddy - Accessible from all learning modes */}
        <FloatingStudyBuddy />

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
