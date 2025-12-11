'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap,
  Users,
  School,
  Building2,
  ChevronDown,
  Check,
  Plus,
} from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

interface RoleSwitcherProps {
  collapsed?: boolean
}

const roleConfig: Record<UserRole, { icon: React.ComponentType<{ className?: string }>; label: string; dashboard: string }> = {
  learner: { icon: GraduationCap, label: 'Learner', dashboard: '/dashboard' },
  parent: { icon: Users, label: 'Parent', dashboard: '/dashboard/parent' },
  educator: { icon: School, label: 'Educator', dashboard: '/dashboard/teacher' },
  institution: { icon: Building2, label: 'Admin', dashboard: '/dashboard/admin' },
}

export default function RoleSwitcher({ collapsed = false }: RoleSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [primaryRole, setPrimaryRole] = useState<UserRole>('learner')
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['learner'])
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch user's roles on mount
  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await fetch('/api/user/role', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setPrimaryRole(data.primary_role || 'learner')
          setAvailableRoles(data.roles || ['learner'])
        }
      } catch (error) {
        console.error('Failed to fetch user roles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRoles()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't show if only one role
  if (availableRoles.length <= 1 && !isLoading) {
    return null
  }

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === primaryRole) {
      setIsOpen(false)
      return
    }

    try {
      const response = await fetch('/api/user/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ primary_role: newRole }),
      })

      if (response.ok) {
        setPrimaryRole(newRole)
        setIsOpen(false)
        // Navigate to the appropriate dashboard
        const dashboard = roleConfig[newRole].dashboard
        router.push(dashboard)
      }
    } catch (error) {
      console.error('Failed to switch role:', error)
    }
  }

  const handleAddRole = () => {
    setIsOpen(false)
    router.push('/dashboard/settings?tab=roles')
  }

  const CurrentIcon = roleConfig[primaryRole].icon

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${
        collapsed ? 'justify-center' : ''
      }`}>
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
        {!collapsed && <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2 py-1.5 bg-accent-primary/10 dark:bg-accent-primary/20 hover:bg-accent-primary/20 dark:hover:bg-accent-primary/30 text-accent-primary rounded-lg transition-all text-[12px] font-medium border border-accent-primary/30 dark:border-accent-primary/50 w-full ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? `Switch role (${roleConfig[primaryRole].label})` : undefined}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{roleConfig[primaryRole].label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0 right-0'} bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[160px]`}>
          {availableRoles.map((role) => {
            const config = roleConfig[role]
            const Icon = config.icon
            const isActive = role === primaryRole
            return (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{config.label}</span>
                {isActive && <Check className="w-4 h-4" />}
              </button>
            )
          })}

          {/* Add Role option */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={handleAddRole}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add another role</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
