'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  Link2,
  ExternalLink,
  Check,
  X,
  Loader2,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw,
  Key,
  Globe,
  ChevronRight,
  Download,
  Upload
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  configured: boolean
  authType: 'oauth' | 'token'
  authUrl?: string
  courses?: Array<{
    id: string
    name: string
    courseCode?: string
    role?: string
  }>
  baseUrl?: string
}

function IntegrationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [showCanvasModal, setShowCanvasModal] = useState(false)
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasError, setCanvasError] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-classroom',
      name: 'Google Classroom',
      description: 'Import assignments and export study materials to Google Classroom',
      icon: <GraduationCap className="w-6 h-6" />,
      connected: false,
      configured: false,
      authType: 'oauth'
    },
    {
      id: 'canvas',
      name: 'Canvas LMS',
      description: 'Connect with your Canvas courses to import and export content',
      icon: <BookOpen className="w-6 h-6" />,
      connected: false,
      configured: true,
      authType: 'token'
    }
  ])

  useEffect(() => {
    // Check for success/error from OAuth callback
    const integration = searchParams.get('integration')
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (integration && success === 'true') {
      setSuccessMessage(`Successfully connected to ${integration === 'google-classroom' ? 'Google Classroom' : 'Canvas LMS'}!`)
      setTimeout(() => setSuccessMessage(null), 5000)
    }

    if (integration && error) {
      // Handle error
      console.error(`Integration error: ${error}`)
    }

    fetchIntegrations()
  }, [searchParams])

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
                  configured: true,
                  courses: canvasData.courses,
                  baseUrl: canvasData.baseUrl
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
    if (integration.id === 'canvas') {
      setShowCanvasModal(true)
      return
    }

    setConnecting(integration.id)

    try {
      if (integration.authUrl) {
        window.location.href = integration.authUrl
      } else {
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

  const handleCanvasConnect = async () => {
    if (!canvasUrl.trim() || !canvasToken.trim()) {
      setCanvasError('Please enter both your Canvas URL and access token')
      return
    }

    setConnecting('canvas')
    setCanvasError('')

    try {
      const response = await fetch('/api/integrations/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: canvasUrl.trim(),
          accessToken: canvasToken.trim()
        })
      })

      if (response.ok) {
        setShowCanvasModal(false)
        setCanvasUrl('')
        setCanvasToken('')
        setSuccessMessage('Successfully connected to Canvas LMS!')
        fetchIntegrations()
      } else {
        const data = await response.json()
        setCanvasError(data.error || 'Failed to connect to Canvas')
      }
    } catch (error) {
      setCanvasError('Failed to connect to Canvas')
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
              ? { ...int, connected: false, courses: undefined, baseUrl: undefined }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Link2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">LMS Integrations</h1>
              <p className="text-white/80 mt-1">Connect your learning management systems</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl text-green-700 dark:text-green-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Integrations List */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          integrations.map(integration => (
            <div
              key={integration.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      integration.connected
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {integration.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {integration.name}
                        </h3>
                        {integration.connected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-full">
                            <Check className="w-3 h-3" />
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {integration.description}
                      </p>

                      {/* Base URL for Canvas */}
                      {integration.connected && integration.baseUrl && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <Globe className="w-4 h-4" />
                          {integration.baseUrl}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {integration.connected ? (
                      <>
                        <button
                          onClick={() => fetchIntegrations()}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={disconnecting === integration.id}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {disconnecting === integration.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(integration)}
                        disabled={connecting === integration.id}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50"
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
                    )}
                  </div>
                </div>

                {/* Connected Courses */}
                {integration.connected && integration.courses && integration.courses.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Connected Courses ({integration.courses.length})
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {integration.courses.slice(0, 6).map(course => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {course.name}
                            </p>
                            {course.courseCode && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {course.courseCode}
                              </p>
                            )}
                          </div>
                          {course.role && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full capitalize">
                              {course.role}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {integration.courses.length > 6 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        +{integration.courses.length - 6} more courses
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Help Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How Integrations Work
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Import</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Import assignments, files, and materials from your LMS to study
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Export</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Share flashcards, mind maps, and study materials to your courses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Connection Modal */}
      {showCanvasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connect Canvas LMS</h2>
              <button onClick={() => setShowCanvasModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Canvas URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    placeholder="https://canvas.instructure.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your school's Canvas URL (e.g., canvas.university.edu)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    placeholder="Your Canvas access token"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Go to Canvas → Account → Settings → New Access Token
                </p>
              </div>

              {canvasError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {canvasError}
                </div>
              )}

              <button
                onClick={handleCanvasConnect}
                disabled={connecting === 'canvas'}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {connecting === 'canvas' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  )
}
