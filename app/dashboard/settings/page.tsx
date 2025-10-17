"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { User, Bell, Palette, Database, Shield, Download, Trash2, Moon, Sun, Save, Loader2 } from "lucide-react"
import Breadcrumb, { settingsBreadcrumb } from "@/components/Breadcrumb"
import { useToast } from "@/components/ToastContainer"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user } = useUser()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'data'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark))
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
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2">
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
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
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
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
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
                        className="w-full px-4 py-2 border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
                        isDarkMode ? "bg-purple-600" : "bg-gray-300"
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
                      {['Small', 'Medium', 'Large'].map((size) => (
                        <button
                          key={size}
                          className="flex-1 px-4 py-2 border border-purple-200 dark:border-purple-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <label className="block font-semibold text-gray-900 dark:text-white mb-3">
                      Accent Color
                    </label>
                    <div className="grid grid-cols-6 gap-3">
                      {[
                        'bg-purple-500',
                        'bg-blue-500',
                        'bg-green-500',
                        'bg-yellow-500',
                        'bg-red-500',
                        'bg-pink-500'
                      ].map((color, index) => (
                        <button
                          key={index}
                          className={cn(
                            "w-12 h-12 rounded-lg border-2 border-transparent hover:border-white transition-all",
                            color,
                            index === 0 && "ring-2 ring-purple-500 ring-offset-2"
                          )}
                        />
                      ))}
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
                    { label: 'Study Reminders', description: 'Get reminded to study daily' },
                    { label: 'New Features', description: 'Learn about new features and updates' },
                    { label: 'Learning Progress', description: 'Weekly learning progress reports' },
                    { label: 'Achievement Badges', description: 'Notifications when you earn badges' }
                  ].map((item, index) => (
                    <div
                      key={index}
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
                        className={cn(
                          "relative w-14 h-8 rounded-full transition-colors bg-purple-600"
                        )}
                      >
                        <span className="absolute top-1 left-7 w-6 h-6 bg-white rounded-full" />
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
