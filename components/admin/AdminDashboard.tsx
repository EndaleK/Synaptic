'use client'

import { useState } from 'react'
import { AdminUser } from '@/lib/auth/admin'
import SystemHealthDashboard from './SystemHealthDashboard'
import UserManagementPanel from './UserManagementPanel'
import AnalyticsDashboard from './AnalyticsDashboard'

interface AdminDashboardProps {
  admin: AdminUser
}

type Tab = 'overview' | 'users' | 'analytics' | 'system'

export default function AdminDashboard({ admin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'system', name: 'System Health', icon: '⚙️' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back, {admin.email} ({admin.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Role Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                admin.role === 'superadmin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  : admin.role === 'editor'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {admin.role.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <SystemHealthDashboard admin={admin} compact />
            <AnalyticsDashboard admin={admin} compact />
          </div>
        )}

        {activeTab === 'users' && <UserManagementPanel admin={admin} />}

        {activeTab === 'analytics' && <AnalyticsDashboard admin={admin} />}

        {activeTab === 'system' && <SystemHealthDashboard admin={admin} />}
      </div>
    </div>
  )
}
