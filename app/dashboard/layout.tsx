"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { BookOpen, Home, Settings, FileText, Menu, X, MessageSquare, Mic, Network, ChevronLeft, ChevronRight, Moon, Sun, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { useUIStore } from "@/lib/store/useStore"
import { SignOutButton } from "@clerk/nextjs"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user} = useUser()
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
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Documents", href: "/dashboard/documents", icon: FileText },
  ]

  const learningModes = [
    { name: "Flashcards", id: "flashcards", icon: BookOpen, comingSoon: false },
    { name: "Chat", id: "chat", icon: MessageSquare, comingSoon: false },
    { name: "Podcast", id: "podcast", icon: Mic, comingSoon: true },
    { name: "Mind Map", id: "mindmap", icon: Network, comingSoon: true },
  ]

  const handleModeClick = (modeId: string, comingSoon: boolean) => {
    if (comingSoon) {
      alert(`This mode is coming soon! Stay tuned.`)
      return
    }
    setActiveMode(modeId as any)
    setSidebarOpen(false)
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
        className={`fixed top-0 left-0 z-50 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              {!sidebarCollapsed && (
                <span className="text-xl font-bold text-black dark:text-white">
                  AI Learning
                </span>
              )}
            </Link>
            {/* Collapse button - desktop only */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
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
                const isActive = pathname === item.href && (item.href !== "/dashboard" || activeMode === "home")
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
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
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
                <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Learning Modes
                </h3>
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
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                      } ${mode.comingSoon ? "opacity-60" : ""} ${sidebarCollapsed ? "justify-center" : ""}`}
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
            {/* Settings Button */}
            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                pathname === "/dashboard/settings"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              title={sidebarCollapsed ? "Settings" : undefined}
            >
              <Settings className="w-5 h-5" />
              {!sidebarCollapsed && "Settings"}
            </Link>

            {/* Theme Toggle & Sign Out Buttons */}
            <div className={`flex gap-2 ${sidebarCollapsed ? "flex-col" : ""}`}>
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium ${
                  sidebarCollapsed ? "w-full" : "flex-1"
                }`}
                title={sidebarCollapsed ? (isDarkMode ? "Light mode" : "Dark mode") : undefined}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {!sidebarCollapsed && <span className="text-sm">{isDarkMode ? "Light" : "Dark"}</span>}
              </button>

              {/* Sign Out Button */}
              <SignOutButton>
                <button
                  className={`flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all font-medium ${
                    sidebarCollapsed ? "w-full" : "flex-1"
                  }`}
                  title={sidebarCollapsed ? "Sign out" : undefined}
                >
                  <LogOut className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="text-sm">Sign Out</span>}
                </button>
              </SignOutButton>
            </div>

            {/* User Info */}
            <div className={`flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl ${
              sidebarCollapsed ? "justify-center" : ""
            }`}>
              <UserButton afterSignOutUrl="/" />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black dark:text-white truncate">
                    {user?.fullName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
