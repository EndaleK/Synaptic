'use client'

import { useEffect, useState } from 'react'
import { AdminUser } from '@/lib/auth/admin'

interface AnalyticsDashboardProps {
  admin: AdminUser
  compact?: boolean
}

interface Analytics {
  users: {
    total: number
    new: number
    premium: number
    active: number
    growthTrend: Array<{ date: string; count: number }>
  }
  content: {
    documents: {
      total: number
      new: number
      typeBreakdown: Record<string, number>
    }
    flashcards: {
      total: number
      new: number
    }
    podcasts: {
      total: number
      new: number
    }
    mindmaps: {
      total: number
      new: number
    }
  }
  engagement: {
    sessions: {
      total: number
      new: number
    }
    studyMinutes: number
    averageMinutesPerSession: number
    mostActiveUsers: Array<{
      id: string
      email: string
      full_name: string | null
      sessionCount: number
    }>
  }
  demographics: {
    learningStyles: Record<string, number>
    subscriptionTiers: Record<string, number>
  }
}

export default function AnalyticsDashboard({ admin, compact = false }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchAnalytics()
  }, [range])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?range=${range}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Platform Analytics
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={analytics.users.total}
              change={analytics.users.new}
              changeLabel="new"
              icon="👥"
            />
            <MetricCard
              title="Premium Users"
              value={analytics.users.premium}
              percentage={
                analytics.users.total > 0
                  ? Math.round((analytics.users.premium / analytics.users.total) * 100)
                  : 0
              }
              icon="💎"
            />
            <MetricCard
              title="Total Documents"
              value={analytics.content.documents.total}
              change={analytics.content.documents.new}
              changeLabel="new"
              icon="📄"
            />
            <MetricCard
              title="Study Minutes"
              value={analytics.engagement.studyMinutes}
              subtitle={`${analytics.engagement.sessions.total} sessions`}
              icon="⏱️"
            />
          </div>

          {/* Content Generation */}
          {!compact && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Content Generation
                </h3>
                <div className="space-y-4">
                  <ContentStat
                    label="Flashcard Sets"
                    total={analytics.content.flashcards.total}
                    newCount={analytics.content.flashcards.new}
                  />
                  <ContentStat
                    label="Podcasts"
                    total={analytics.content.podcasts.total}
                    newCount={analytics.content.podcasts.new}
                  />
                  <ContentStat
                    label="Mind Maps"
                    total={analytics.content.mindmaps.total}
                    newCount={analytics.content.mindmaps.new}
                  />
                  <ContentStat
                    label="Documents"
                    total={analytics.content.documents.total}
                    newCount={analytics.content.documents.new}
                  />
                </div>
              </div>

              {/* Document Types */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Document Types
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.content.documents.typeBreakdown).map(
                    ([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {type}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (count /
                                    Math.max(
                                      ...Object.values(
                                        analytics.content.documents.typeBreakdown
                                      )
                                    )) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Learning Styles */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Learning Styles
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.demographics.learningStyles).map(
                    ([style, count]) => (
                      <div key={style} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {style.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (count /
                                    Math.max(
                                      ...Object.values(analytics.demographics.learningStyles)
                                    )) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Subscription Tiers */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscription Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.demographics.subscriptionTiers).map(
                    ([tier, count]) => {
                      const total = Object.values(
                        analytics.demographics.subscriptionTiers
                      ).reduce((a, b) => a + b, 0)
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0

                      return (
                        <div key={tier} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {tier}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">
                              {count} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Most Active Users */}
          {!compact && analytics.engagement.mostActiveUsers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Most Active Users
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.engagement.mostActiveUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white font-medium">
                          {user.sessionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Helper Components

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  percentage,
  subtitle,
  icon,
}: {
  title: string
  value: number
  change?: number
  changeLabel?: string
  percentage?: number
  subtitle?: string
  icon: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </p>
        {change !== undefined && (
          <span className="text-sm text-green-600 dark:text-green-400">
            +{change} {changeLabel}
          </span>
        )}
        {percentage !== undefined && (
          <span className="text-sm text-gray-500 dark:text-gray-400">({percentage}%)</span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  )
}

function ContentStat({
  label,
  total,
  newCount,
}: {
  label: string
  total: number
  newCount: number
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {total.toLocaleString()}
        </span>
        {newCount > 0 && (
          <span className="text-xs text-green-600 dark:text-green-400">+{newCount}</span>
        )}
      </div>
    </div>
  )
}
