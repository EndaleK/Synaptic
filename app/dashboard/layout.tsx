"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { BookOpen, Home, Settings, FileText, Menu, X, MessageSquare, Mic, Network, ChevronLeft, ChevronRight, Moon, Sun, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { useUIStore } from "@/lib/store/useStore"
import { useToast } from "@/components/ToastContainer"
import { SignOutButton } from "@clerk/nextjs"

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
  const { activeMode, setActiveMode } = useUIStore()

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

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
    { name: "Flashcards", id: "flashcards", icon: BookOpen, comingSoon: false },
    { name: "Chat", id: "chat", icon: MessageSquare, comingSoon: false },
    { name: "Podcast", id: "podcast", icon: Mic, comingSoon: false },
    { name: "Mind Map", id: "mindmap", icon: Network, comingSoon: false },
  ]

  const handleModeClick = (modeId: string, comingSoon: boolean) => {
    if (comingSoon) {
      toast.info('This mode is coming soon! Stay tuned.')
      return
    }
    setActiveMode(modeId as any)
    setSidebarOpen(false)
    // Navigate to dashboard if not already there
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              {!sidebarCollapsed ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">AI</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
                      AI Learning
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Study Smarter
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">AI</span>
                </div>
              )}
            </Link>
            {/* Collapse button - desktop only */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 text-gray-600 dark:text-gray-400 hover:text-accent-primary rounded-lg hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 transition-colors"
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
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-2">
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                        : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                    } ${sidebarCollapsed ? "justify-center" : ""}`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5" />
                    {!sidebarCollapsed && item.name}
                  </Link>
                )
              })}
            </div>

            {/* Learning Modes Section */}
            <div>
              {!sidebarCollapsed && (
                <div className="px-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-accent-primary/20 to-transparent"></div>
                    <h3 className="text-xs font-semibold text-accent-primary uppercase tracking-wider">
                      Learning Modes
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-l from-accent-primary/20 to-transparent"></div>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {learningModes.map((mode) => {
                  const isActive = pathname === "/dashboard" && activeMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeClick(mode.id, mode.comingSoon)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left ${
                        isActive
                          ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/30"
                          : mode.comingSoon
                          ? "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          : "text-gray-600 dark:text-gray-400 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20 hover:text-accent-primary dark:hover:text-accent-primary"
                      } ${sidebarCollapsed ? "justify-center" : ""}`}
                      title={sidebarCollapsed ? mode.name : undefined}
                    >
                      <mode.icon className="w-5 h-5" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{mode.name}</span>
                          {mode.comingSoon && (
                            <span className="px-2 py-0.5 text-xs bg-gray-300 dark:bg-gray-700 rounded-full">
                              Soon
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {/* Theme Toggle & Sign Out Buttons */}
            <div className={`flex gap-2 ${sidebarCollapsed ? "flex-col" : ""}`}>
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary/10 dark:bg-accent-primary/20 hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 text-accent-primary rounded-xl transition-all font-medium border border-accent-primary/30 dark:border-accent-primary/50 ${
                  sidebarCollapsed ? "w-full" : "flex-1"
                }`}
                title={sidebarCollapsed ? (isDarkMode ? "Light mode" : "Dark mode") : undefined}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {!sidebarCollapsed && <span className="text-sm font-medium">{isDarkMode ? "Light" : "Dark"}</span>}
              </button>

              {/* Sign Out Button */}
              <SignOutButton>
                <button
                  className={`flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all font-medium border border-red-200 dark:border-red-800 ${
                    sidebarCollapsed ? "w-full" : "flex-1"
                  }`}
                  title={sidebarCollapsed ? "Sign out" : undefined}
                >
                  <LogOut className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
                </button>
              </SignOutButton>
            </div>

            {/* User Info */}
            <div className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-xl border border-accent-primary/20 dark:border-accent-primary/50 ${
              sidebarCollapsed ? "justify-center" : ""
            }`}>
              <div className="relative">
                <UserButton afterSignOutUrl="/" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black dark:text-white truncate">
                    {user?.fullName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              )}
            </div>

            {/* Copyright Notice */}
            <div className={`px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 ${
              sidebarCollapsed ? "text-center" : ""
            }`}>
              {sidebarCollapsed ? (
                <p className="text-[10px]">©</p>
              ) : (
                <p>© 2025 ካንእ AI Study Guide</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-bold text-black dark:text-white">
                AI Learning
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                title={isDarkMode ? "Light mode" : "Dark mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  )
}
