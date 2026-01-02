'use client'

import { useState, useEffect } from 'react'
import {
  Link2,
  ExternalLink,
  Check,
  X,
  Loader2,
  RefreshCw,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Unplug
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  configured: boolean
  authUrl?: string
  courses?: Array<{
    id: string
    name: string
    section?: string
  }>
}

interface IntegrationsWidgetProps {
  compact?: boolean
}

export default function IntegrationsWidget({ compact = false }: IntegrationsWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: 'Import assignments and export study materials',
      icon: <GraduationCap className="w-5 h-5" />,
      connected: false,
      configured: false
    },
    {
      id: 'canvas',
      name: 'Canvas LMS',
      description: 'Connect with your Canvas courses',
      icon: <BookOpen className="w-5 h-5" />,
      connected: false,
      configured: false
    }
  ])

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    setLoading(true)

    try {
      // Fetch Google Classroom status
      const gcResponse = await fetch('/api/integrations/google-classroom')
      if (gcResponse.ok) {
        const gcData = await gcResponse.json()
        setIntegrations(prev =>
          prev.map(int =>
            int.id === 'google-classroom'
              ? {
                  ...int,
                  connected: gcData.connected,
                  configured: gcData.configured,
                  authUrl: gcData.authUrl,
                  courses: gcData.courses
                }
              : int
          )
        )
      }

      // Fetch Canvas status
      const canvasResponse = await fetch('/api/integrations/canvas')
      if (canvasResponse.ok) {
        const canvasData = await canvasResponse.json()
        setIntegrations(prev =>
          prev.map(int =>
            int.id === 'canvas'
              ? {
                  ...int,
                  connected: canvasData.connected,
                  configured: canvasData.configured,
                  authUrl: canvasData.authUrl,
                  courses: canvasData.courses
                }
              : int
          )
        )
      }
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (integration: Integration) => {
    if (!integration.configured) {
      return
    }

    setConnecting(integration.id)

    try {
      if (integration.authUrl) {
        // Redirect to OAuth
        window.location.href = integration.authUrl
      } else {
        // Fetch auth URL
        const response = await fetch(`/api/integrations/${integration.id}`, {
          method: 'POST'
        })

        if (response.ok) {
          const data = await response.json()
          if (data.authUrl) {
            window.location.href = data.authUrl
          }
        }
      }
    } catch (error) {
      console.error('Error connecting:', error)
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return
    }

    setDisconnecting(integrationId)

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setIntegrations(prev =>
          prev.map(int =>
            int.id === integrationId
              ? { ...int, connected: false, courses: undefined }
              : int
          )
        )
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    } finally {
      setDisconnecting(null)
    }
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Integrations
            </h3>
          </div>
          <button
            onClick={fetchIntegrations}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          {integrations.map(integration => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  integration.connected
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {integration.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {integration.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {integration.connected
                      ? `${integration.courses?.length || 0} courses`
                      : integration.configured
                        ? 'Not connected'
                        : 'Not configured'
                    }
                  </p>
                </div>
              </div>

              {integration.connected ? (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
              ) : integration.configured ? (
                <button
                  onClick={() => handleConnect(integration)}
                  disabled={connecting === integration.id}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {connecting === integration.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </button>
              ) : (
                <span className="text-xs text-gray-400">Coming soon</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full view
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              LMS Integrations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect your learning management systems
            </p>
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          integrations.map(integration => (
            <div
              key={integration.id}
              className={`p-5 rounded-xl border-2 transition-all ${
                integration.connected
                  ? 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    integration.connected
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {integration.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      {integration.connected && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {integration.description}
                    </p>

                    {/* Connected courses */}
                    {integration.connected && integration.courses && integration.courses.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {integration.courses.length} courses connected
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {integration.courses.slice(0, 3).map(course => (
                            <span
                              key={course.id}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                            >
                              {course.name}
                            </span>
                          ))}
                          {integration.courses.length > 3 && (
                            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                              +{integration.courses.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {integration.connected ? (
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={disconnecting === integration.id}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {disconnecting === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unplug className="w-4 h-4" />
                      )}
                      Disconnect
                    </button>
                  ) : integration.configured ? (
                    <button
                      onClick={() => handleConnect(integration)}
                      disabled={connecting === integration.id}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-md"
                    >
                      {connecting === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Connect
                          <ExternalLink className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="px-6 pb-6">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Tip:</strong> Connect your LMS to import assignments and export study materials directly to your courses.
          </p>
        </div>
      </div>
    </div>
  )
}
