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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavClick(item)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl transition-all min-w-[72px] min-h-[60px] active:scale-95",
              item.active
                ? "text-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <item.icon className={cn(
              "w-6 h-6",
              item.active && "scale-110 stroke-[2.5]"
            )} />
            <span className={cn(
              "text-[11px] font-semibold whitespace-nowrap",
              item.active && "font-bold"
            )}>
              {item.name}
            </span>
          </button>
        ))}

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl transition-all min-w-[72px] min-h-[60px] active:scale-95",
            isMenuOpen
              ? "text-accent-primary bg-accent-primary/10 dark:bg-accent-primary/20"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          {isMenuOpen ? (
            <X className={cn("w-6 h-6", isMenuOpen && "scale-110 stroke-[2.5]")} />
          ) : (
            <Menu className="w-6 h-6" />
          )}
          <span className={cn(
            "text-[11px] font-semibold whitespace-nowrap",
            isMenuOpen && "font-bold"
          )}>
            Menu
          </span>
        </button>
      </div>
    </nav>
  )
}
