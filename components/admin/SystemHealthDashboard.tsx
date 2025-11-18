'use client'

import { useEffect, useState } from 'react'
import { AdminUser } from '@/lib/auth/admin'

interface SystemHealthDashboardProps {
  admin: AdminUser
  compact?: boolean
}

interface HealthMetrics {
  api: {
    status: 'healthy' | 'degraded' | 'down'
    avgLatency: number
    errorRate: number
    requestsPerMinute: number
  }
  database: {
    status: 'healthy' | 'degraded' | 'down'
    avgQueryTime: number
    slowQueries: number
    activeConnections: number
  }
  storage: {
    status: 'healthy' | 'degraded' | 'down'
    uploadSuccess: number
    avgUploadTime: number
  }
  ai: {
    openai: { status: 'healthy' | 'down'; avgLatency: number }
    deepseek: { status: 'healthy' | 'down'; avgLatency: number }
  }
}

export default function SystemHealthDashboard({ admin, compact = false }: SystemHealthDashboardProps) {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchMetrics() {
    try {
      const response = await fetch('/api/admin/system-health')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200'
      case 'down':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return '✓'
      case 'degraded':
        return '⚠'
      case 'down':
        return '✗'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            System Health
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="p-6">
        {!metrics ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load system health metrics
            </p>
            <button
              onClick={fetchMetrics}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Health */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">API Services</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.api.status)}`}>
                  {getStatusIcon(metrics.api.status)} {metrics.api.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Latency:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{metrics.api.avgLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{metrics.api.errorRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Requests/min:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{metrics.api.requestsPerMinute}</span>
                </div>
              </div>
            </div>

            {/* Database Health */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Database</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.database.status)}`}>
                  {getStatusIcon(metrics.database.status)} {metrics.database.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Query Time:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{metrics.database.avgQueryTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Slow Queries:</span>
                  <span className={`font-medium ${metrics.database.slowQueries > 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {metrics.database.slowQueries}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Connections:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{metrics.database.activeConnections}</span>
                </div>
              </div>
            </div>

            {!compact && (
              <>
                {/* Storage Health */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">Storage</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.storage.status)}`}>
                      {getStatusIcon(metrics.storage.status)} {metrics.storage.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Upload Success:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{metrics.storage.uploadSuccess}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg Upload Time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{metrics.storage.avgUploadTime}s</span>
                    </div>
                  </div>
                </div>

                {/* AI Providers Health */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">AI Providers</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600 dark:text-gray-400">OpenAI:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          metrics.ai.openai.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {metrics.ai.openai.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Latency: {metrics.ai.openai.avgLatency}ms
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600 dark:text-gray-400">DeepSeek:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          metrics.ai.deepseek.status === 'healthy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {metrics.ai.deepseek.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Latency: {metrics.ai.deepseek.avgLatency}ms
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <a
            href="https://sentry.io/organizations/synaptic-a2/projects/synaptic-production/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            View detailed metrics in Sentry →
          </a>
        </div>
      )}
    </div>
  )
}
