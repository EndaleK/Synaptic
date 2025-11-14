"use client"

import { Home, BookOpen, MessageSquare, Library, Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useUIStore } from "@/lib/store/useStore"
import { cn } from "@/lib/utils"

interface BottomNavigationBarProps {
  onMenuClick: () => void
  isMenuOpen: boolean
}

export default function BottomNavigationBar({ onMenuClick, isMenuOpen }: BottomNavigationBarProps) {
  const pathname = usePathname()
  const { activeMode, setActiveMode } = useUIStore()

  const navItems = [
    {
      name: "Home",
      icon: Home,
      mode: "home",
      active: activeMode === "home" && pathname === "/dashboard"
    },
    {
      name: "Cards",
      icon: BookOpen,
      mode: "flashcards",
      active: activeMode === "flashcards" && pathname === "/dashboard"
    },
    {
      name: "Chat",
      icon: MessageSquare,
      mode: "chat",
      active: activeMode === "chat" && pathname === "/dashboard"
    },
    {
      name: "Library",
      icon: Library,
      href: "/dashboard/library",
      active: pathname === "/dashboard/library"
    },
  ]

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.mode) {
      setActiveMode(item.mode as any)
      // Navigate to dashboard if not already there
      if (pathname !== '/dashboard') {
        window.location.href = '/dashboard'
      }
    } else if (item.href) {
      window.location.href = item.href
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavClick(item)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all btn-touch-icon",
              item.active
                ? "text-accent-primary bg-accent-primary/10"
                : "text-gray-600 dark:text-gray-400 hover:text-accent-primary hover:bg-accent-primary/5"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              item.active && "stroke-[2.5]"
            )} />
            <span className={cn(
              "text-xs font-medium",
              item.active && "font-semibold"
            )}>
              {item.name}
            </span>
          </button>
        ))}

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all btn-touch-icon",
            isMenuOpen
              ? "text-accent-primary bg-accent-primary/10"
              : "text-gray-600 dark:text-gray-400 hover:text-accent-primary hover:bg-accent-primary/5"
          )}
        >
          {isMenuOpen ? (
            <X className={cn("w-5 h-5", isMenuOpen && "stroke-[2.5]")} />
          ) : (
            <Menu className="w-5 h-5" />
          )}
          <span className={cn(
            "text-xs font-medium",
            isMenuOpen && "font-semibold"
          )}>
            Menu
          </span>
        </button>
      </div>
    </nav>
  )
}
