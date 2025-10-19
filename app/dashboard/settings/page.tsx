"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { User, Bell, Palette, Database, Shield, Download, Trash2, Moon, Sun, Save, Loader2 } from "lucide-react"
import Breadcrumb, { settingsBreadcrumb } from "@/components/Breadcrumb"
import { useToast } from "@/components/ToastContainer"
import { cn } from "@/lib/utils"
import { type AccentColor, applyAccentColor, saveAccentColor, getSavedAccentColor } from "@/lib/accent-color-utils"

type FontSize = 'small' | 'medium' | 'large'

interface NotificationPreferences {
  studyReminders: boolean
  newFeatures: boolean
  learningProgress: boolean
  achievementBadges: boolean
}

export default function SettingsPage() {
  const { user } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'data'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [accentColor, setAccentColor] = useState<AccentColor>('default')
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    studyReminders: true,
    newFeatures: true,
    learningProgress: false,
    achievementBadges: true
  })

  // Initialize all settings from localStorage
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark))

    // Font Size
    const savedFontSize = localStorage.getItem('fontSize') as FontSize
    if (savedFontSize) {
      setFontSize(savedFontSize)
      document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
      document.documentElement.classList.add(`font-size-${savedFontSize}`)
    }

    // Accent Color
    const savedAccentColor = getSavedAccentColor()
    const colorToUse = savedAccentColor || 'default'
    setAccentColor(colorToUse)
    applyAccentColor(colorToUse)

    // Notifications
    const savedNotifications = localStorage.getItem('notificationPreferences')
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
  }, [])


  const handleThemeToggle = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    toast.success('Theme updated successfully')
  }

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size)
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large')
    document.documentElement.classList.add(`font-size-${size}`)
    localStorage.setItem('fontSize', size)
    toast.success(`Font size changed to ${size}`)
  }

  const handleAccentColorChange = (color: AccentColor) => {
    setAccentColor(color)
    applyAccentColor(color)
    saveAccentColor(color)

    if (color === 'default') {
      toast.success('Reset to default theme')
    } else {
      toast.success(`Accent color changed to ${color}`)
    }
  }

  const handleNotificationToggle = (key: keyof NotificationPreferences) => {
    const newNotifications = {
      ...notifications,
      [key]: !notifications[key]
    }
    setNotifications(newNotifications)
    localStorage.setItem('notificationPreferences', JSON.stringify(newNotifications))
    toast.success(`${key} ${newNotifications[key] ? 'enabled' : 'disabled'}`)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    toast.success('Profile settings saved successfully')
  }

  const handleExportData = () => {
    toast.info('Preparing your data export...')
    // Implementation for data export
  }

  const handleDeleteAccount = () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )
    if (confirmed) {
      toast.error('Account deletion requested. Please contact support.')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Privacy', icon: Database }
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb items={settingsBreadcrumb} className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg"
                        : "text-gray-700 dark:text-gray-300 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Profile Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your personal information
                  </p>
                </div>

                <div className="space-y-4">
                  {/* User Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {user?.fullName || user?.username || 'User'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.fullName || ''}
                        className="w-full px-4 py-2 border border-accent-primary/30 dark:border-accent-primary/50 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.primaryEmailAddress?.emailAddress || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Email cannot be changed from this page
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Learning Goals
                      </label>
                      <textarea
                        placeholder="What are your learning goals?"
                        rows={4}
                        className="w-full px-4 py-2 border border-accent-primary/30 dark:border-accent-primary/50 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:from-accent-primary-hover hover:to-accent-secondary-hover transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Appearance
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Customize how the app looks
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? (
                        <Moon className="w-5 h-5 text-accent-primary" />
                      ) : (
                        <Sun className="w-5 h-5 text-accent-primary" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Theme
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {isDarkMode ? 'Dark mode' : 'Light mode'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleThemeToggle}
                      className={cn(
                        "relative w-14 h-8 rounded-full transition-colors",
                        isDarkMode ? "bg-accent-primary" : "bg-gray-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
                          isDarkMode ? "left-7" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* Font Size */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="block font-semibold text-gray-900 dark:text-white mb-3">
                      Font Size
                    </label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleFontSizeChange(size)}
                          className={cn(
                            "flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-all",
                            fontSize === size
                              ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white border-transparent shadow-md"
                              : "border-accent-primary/30 dark:border-accent-primary/50 text-gray-700 dark:text-gray-300 hover:bg-accent-primary/10 dark:hover:bg-accent-primary/20"
                          )}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg space-y-6">
                    <div>
                      <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                        Accent Color
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Choose a color theme for your learning experience
                      </p>
                    </div>

                    {/* Default Theme - Full Width Card */}
                    <button
                      onClick={() => handleAccentColorChange('default')}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] flex items-center gap-4",
                        accentColor === 'default'
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 border-transparent shadow-lg"
                          : "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0",
                        accentColor === 'default' && "ring-2 ring-white ring-offset-2"
                      )}>
                        {accentColor === 'default' && (
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <h4 className={cn(
                          "font-semibold text-base",
                          accentColor === 'default' ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          System Default
                        </h4>
                        <p className={cn(
                          "text-sm",
                          accentColor === 'default' ? "text-white/80" : "text-gray-600 dark:text-gray-400"
                        )}>
                          Classic purple & pink gradient
                        </p>
                      </div>
                    </button>

                    {/* Vibrant Colors */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Vibrant Colors
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                      </div>
                      <div className="grid grid-cols-3 gap-5">
                        {[
                          { name: 'purple' as AccentColor, gradient: 'from-purple-400 via-purple-500 to-purple-600', label: 'Purple', shadow: 'hover:shadow-purple-500/50' },
                          { name: 'blue' as AccentColor, gradient: 'from-blue-400 via-blue-500 to-blue-600', label: 'Blue', shadow: 'hover:shadow-blue-500/50' },
                          { name: 'green' as AccentColor, gradient: 'from-green-400 via-green-500 to-green-600', label: 'Green', shadow: 'hover:shadow-green-500/50' },
                          { name: 'yellow' as AccentColor, gradient: 'from-yellow-400 via-yellow-500 to-yellow-600', label: 'Yellow', shadow: 'hover:shadow-yellow-500/50' },
                          { name: 'red' as AccentColor, gradient: 'from-red-400 via-red-500 to-red-600', label: 'Red', shadow: 'hover:shadow-red-500/50' },
                          { name: 'pink' as AccentColor, gradient: 'from-pink-400 via-pink-500 to-pink-600', label: 'Pink', shadow: 'hover:shadow-pink-500/50' },
                        ].map((color) => (
                          <button
                            key={color.name}
                            onClick={() => handleAccentColorChange(color.name)}
                            className="group relative"
                          >
                            <div className={cn(
                              "relative w-full aspect-square rounded-2xl transition-all duration-300",
                              "bg-gradient-to-br",
                              color.gradient,
                              accentColor === color.name
                                ? "ring-4 ring-offset-2 dark:ring-offset-gray-900 ring-gray-400 dark:ring-white/30 shadow-2xl scale-105"
                                : `hover:scale-105 hover:shadow-xl ${color.shadow} shadow-lg`
                            )}>
                              {/* Glass overlay effect */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-50" />

                              {/* Checkmark */}
                              {accentColor === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/50">
                                    <svg className="w-6 h-6 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className={cn(
                              "mt-2 text-sm font-semibold text-center transition-all",
                              accentColor === color.name
                                ? "text-gray-900 dark:text-white scale-105"
                                : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                            )}>
                              {color.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trendy & Fresh */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Trendy & Fresh
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                      </div>
                      <div className="grid grid-cols-3 gap-5">
                        {[
                          { name: 'teal' as AccentColor, gradient: 'from-teal-400 via-teal-500 to-cyan-600', label: 'Teal', shadow: 'hover:shadow-teal-500/50' },
                          { name: 'coral' as AccentColor, gradient: 'from-orange-300 via-orange-400 to-orange-500', label: 'Coral', shadow: 'hover:shadow-orange-400/50' },
                          { name: 'lavender' as AccentColor, gradient: 'from-violet-300 via-violet-400 to-purple-500', label: 'Lavender', shadow: 'hover:shadow-violet-400/50' },
                          { name: 'mint' as AccentColor, gradient: 'from-emerald-300 via-emerald-400 to-green-500', label: 'Mint', shadow: 'hover:shadow-emerald-400/50' },
                          { name: 'rose' as AccentColor, gradient: 'from-pink-300 via-pink-400 to-rose-500', label: 'Rose', shadow: 'hover:shadow-pink-400/50' },
                          { name: 'electric' as AccentColor, gradient: 'from-blue-300 via-blue-400 to-cyan-500', label: 'Electric', shadow: 'hover:shadow-blue-400/50' },
                        ].map((color) => (
                          <button
                            key={color.name}
                            onClick={() => handleAccentColorChange(color.name)}
                            className="group relative"
                          >
                            <div className={cn(
                              "relative w-full aspect-square rounded-2xl transition-all duration-300",
                              "bg-gradient-to-br",
                              color.gradient,
                              accentColor === color.name
                                ? "ring-4 ring-offset-2 dark:ring-offset-gray-900 ring-gray-400 dark:ring-white/30 shadow-2xl scale-105"
                                : `hover:scale-105 hover:shadow-xl ${color.shadow} shadow-lg`
                            )}>
                              {/* Glass overlay effect */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-50" />

                              {/* Checkmark */}
                              {accentColor === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/50">
                                    <svg className="w-6 h-6 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className={cn(
                              "mt-2 text-sm font-semibold text-center transition-all",
                              accentColor === color.name
                                ? "text-gray-900 dark:text-white scale-105"
                                : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                            )}>
                              {color.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Professional & Neutral */}
                    <div className="space-y-4">
                      {/* Elegant header with gradient dividers */}
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Professional & Neutral
                        </h4>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                      </div>

                      {/* Enhanced color tiles with gradients */}
                      <div className="grid grid-cols-2 gap-5">
                        {[
                          { name: 'slate' as AccentColor, gradient: 'from-slate-400 via-slate-500 to-slate-600', label: 'Slate', shadow: 'hover:shadow-slate-500/50' },
                          { name: 'gray' as AccentColor, gradient: 'from-gray-400 via-gray-500 to-gray-600', label: 'Gray', shadow: 'hover:shadow-gray-500/50' },
                          { name: 'neutral' as AccentColor, gradient: 'from-neutral-400 via-neutral-500 to-neutral-600', label: 'Neutral', shadow: 'hover:shadow-neutral-500/50' },
                          { name: 'stone' as AccentColor, gradient: 'from-stone-400 via-stone-500 to-stone-600', label: 'Stone', shadow: 'hover:shadow-stone-500/50' },
                        ].map((color) => (
                          <button
                            key={color.name}
                            onClick={() => handleAccentColorChange(color.name)}
                            className="group relative"
                          >
                            <div className={cn(
                              "relative w-full aspect-square rounded-2xl transition-all duration-300",
                              "bg-gradient-to-br",
                              color.gradient,
                              accentColor === color.name
                                ? "ring-4 ring-offset-2 dark:ring-offset-gray-900 ring-gray-400 dark:ring-white/30 shadow-2xl scale-105"
                                : `hover:scale-105 hover:shadow-xl ${color.shadow} shadow-lg`
                            )}>
                              {/* Glass overlay effect */}
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-50" />

                              {/* Enhanced checkmark with backdrop blur */}
                              {accentColor === color.name && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/50">
                                    <svg className="w-6 h-6 text-white drop-shadow-2xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className={cn(
                              "mt-2 text-sm font-semibold text-center transition-all",
                              accentColor === color.name
                                ? "text-gray-900 dark:text-white scale-105"
                                : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                            )}>
                              {color.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Notifications
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your notification preferences
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'studyReminders' as keyof NotificationPreferences, label: 'Study Reminders', description: 'Get reminded to study daily' },
                    { key: 'newFeatures' as keyof NotificationPreferences, label: 'New Features', description: 'Learn about new features and updates' },
                    { key: 'learningProgress' as keyof NotificationPreferences, label: 'Learning Progress', description: 'Weekly learning progress reports' },
                    { key: 'achievementBadges' as keyof NotificationPreferences, label: 'Achievement Badges', description: 'Notifications when you earn badges' }
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {item.label}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle(item.key)}
                        className={cn(
                          "relative w-14 h-8 rounded-full transition-colors",
                          notifications[item.key] ? "bg-accent-primary" : "bg-gray-300 dark:bg-gray-600"
                        )}
                        aria-label={`Toggle ${item.label}`}
                      >
                        <span
                          className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
                            notifications[item.key] ? "left-7" : "left-1"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data & Privacy Settings */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Data & Privacy
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your data and privacy settings
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Export Data */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Export Your Data
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Download a copy of all your documents, flashcards, and learning data
                        </p>
                        <button
                          onClick={handleExportData}
                          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          Export Data
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Account */}
                  <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <div className="flex items-start gap-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Delete Account
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button
                          onClick={handleDeleteAccount}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Policy */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Privacy & Terms
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Review our privacy policy and terms of service
                        </p>
                        <div className="flex gap-3">
                          <button className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                            Privacy Policy
                          </button>
                          <button className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                            Terms of Service
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
