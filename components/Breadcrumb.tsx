"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-2 text-sm", className)}
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const Icon = item.icon

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400 dark:text-gray-600" />
              )}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast
                      ? "text-gray-900 dark:text-white font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Preset breadcrumb configurations
export const dashboardBreadcrumb: BreadcrumbItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home }
]

export const documentsBreadcrumb: BreadcrumbItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Documents", href: "/dashboard/documents" }
]

export const settingsBreadcrumb: BreadcrumbItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Settings" }
]

export function createDocumentBreadcrumb(documentName: string): BreadcrumbItem[] {
  return [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Documents", href: "/dashboard/documents" },
    { label: documentName }
  ]
}
