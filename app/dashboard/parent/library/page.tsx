'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Library,
  FileText,
  BookOpen,
  Video,
  Link2,
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  Mic,
  Map,
  Users,
  Loader2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SharedResource {
  id: string
  organization_id: string
  title: string
  description: string | null
  resource_type: string
  subject: string | null
  grade_levels: number[]
  document_id: string | null
  external_url: string | null
  visibility: string
  tags: string[]
  estimated_hours: number | null
  is_active: boolean
  created_at: string
  organization?: { id: string; name: string }
  document?: { id: string; file_name: string; file_type: string }
  userUsage?: Array<{ action: string }>
}

type ResourceType = 'document' | 'textbook' | 'workbook' | 'video' | 'url'

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: typeof FileText }[] = [
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'textbook', label: 'Textbook', icon: BookOpen },
  { value: 'workbook', label: 'Workbook', icon: GraduationCap },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'url', label: 'External Link', icon: Link2 },
]

const GRADE_LEVELS = [
  { value: 0, label: 'Kindergarten' },
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 7, label: 'Grade 7' },
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
]

const SUBJECTS = [
  'Language Arts',
  'Mathematics',
  'Science',
  'Social Studies',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Health',
  'Computer Science',
  'Foreign Language',
  'Religious Studies',
  'Other',
]

export default function BrowseLibraryPage() {
  const router = useRouter()
  const [resources, setResources] = useState<SharedResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [filterGrade, setFilterGrade] = useState<number | null>(null)

  // Generate modal state
  const [selectedResource, setSelectedResource] = useState<SharedResource | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  useEffect(() => {
    fetchResources()
  }, [filterSubject, filterGrade])

  async function fetchResources() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterSubject) params.append('subject', filterSubject)
      if (filterGrade !== null) params.append('gradeLevel', String(filterGrade))
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/shared-resources?${params}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to view shared resources.')
          return
        }
        throw new Error('Failed to fetch resources')
      }

      const data = await res.json()
      setResources(data.resources || [])
    } catch (err) {
      console.error('Error fetching resources:', err)
      setError('Failed to load shared resources')
    } finally {
      setLoading(false)
    }
  }

  const handleUseResource = (resource: SharedResource) => {
    setSelectedResource(resource)
    setShowGenerateModal(true)
  }

  const filteredResources = resources.filter(resource => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!resource.title.toLowerCase().includes(query) &&
          !resource.description?.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  // Group resources by organization
  const resourcesByOrg = filteredResources.reduce((acc, resource) => {
    const orgName = resource.organization?.name || 'Unknown Organization'
    if (!acc[orgName]) {
      acc[orgName] = []
    }
    acc[orgName].push(resource)
    return acc
  }, {} as Record<string, SharedResource[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading shared resources...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/dashboard/parent')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Library className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Curriculum Library</h1>
              <p className="text-sm text-slate-600">
                Browse shared curriculum resources from your organizations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={filterSubject || ''}
            onChange={(e) => setFilterSubject(e.target.value || null)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Subjects</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={filterGrade ?? ''}
            onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Grades</option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade.value} value={grade.value}>{grade.label}</option>
            ))}
          </select>

          <button
            onClick={() => fetchResources()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
        </div>

        {/* Resources */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Library className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No Resources Available
            </h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {searchQuery || filterSubject || filterGrade !== null
                ? 'No resources match your current filters. Try adjusting your search criteria.'
                : 'Your organization hasn\'t shared any curriculum resources yet. Check back later or contact your administrator.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(resourcesByOrg).map(([orgName, orgResources]) => (
              <div key={orgName}>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900">{orgName}</h2>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-sm rounded-full">
                    {orgResources.length} resources
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onUse={() => handleUseResource(resource)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Content Modal */}
      {showGenerateModal && selectedResource && (
        <GenerateContentModal
          resource={selectedResource}
          onClose={() => {
            setShowGenerateModal(false)
            setSelectedResource(null)
          }}
        />
      )}
    </div>
  )
}

function ResourceCard({
  resource,
  onUse,
}: {
  resource: SharedResource
  onUse: () => void
}) {
  const typeConfig = RESOURCE_TYPES.find(t => t.value === resource.resource_type) || RESOURCE_TYPES[0]
  const TypeIcon = typeConfig.icon
  const hasUsed = resource.userUsage && resource.userUsage.length > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <TypeIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{resource.title}</h3>
            <span className="text-xs text-slate-500">{typeConfig.label}</span>
          </div>
          {hasUsed && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Used
            </span>
          )}
        </div>

        {resource.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {resource.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {resource.subject && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              {resource.subject}
            </span>
          )}
          {resource.grade_levels.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {resource.grade_levels.length === 1
                ? GRADE_LEVELS.find(g => g.value === resource.grade_levels[0])?.label
                : `Grades ${Math.min(...resource.grade_levels)}-${Math.max(...resource.grade_levels)}`}
            </span>
          )}
          {resource.estimated_hours && (
            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
              ~{resource.estimated_hours}h
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-between">
        {resource.external_url ? (
          <a
            href={resource.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Open Link
          </a>
        ) : (
          <span className="text-sm text-slate-400">Document</span>
        )}
        <button
          onClick={onUse}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
        >
          <Play className="h-3 w-3" />
          Use Resource
        </button>
      </div>
    </div>
  )
}

function GenerateContentModal({
  resource,
  onClose,
}: {
  resource: SharedResource
  onClose: () => void
}) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [selectedType, setSelectedType] = useState<'flashcards' | 'podcast' | 'mindmap' | null>(null)

  const contentTypes = [
    {
      id: 'flashcards' as const,
      title: 'Flashcards',
      description: 'Generate flashcards for spaced repetition learning',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'podcast' as const,
      title: 'Podcast',
      description: 'Create an audio summary to listen and learn',
      icon: Mic,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'mindmap' as const,
      title: 'Mind Map',
      description: 'Visualize concepts with an interactive mind map',
      icon: Map,
      color: 'from-blue-500 to-cyan-500',
    },
  ]

  const handleGenerate = async () => {
    if (!selectedType || !resource.document_id) return

    setGenerating(true)

    try {
      // Track usage
      await fetch('/api/resource-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resourceId: resource.id,
          action: `generated_${selectedType}`,
        }),
      })

      // Navigate to the document with the selected generation type
      const url = `/dashboard/documents/${resource.document_id}?generate=${selectedType}`
      router.push(url)
    } catch (err) {
      console.error('Error:', err)
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Generate Learning Content
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Choose what to create from &ldquo;{resource.title}&rdquo;
          </p>
        </div>

        <div className="p-6">
          {!resource.document_id ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">External Resource</h3>
              <p className="text-slate-600 text-sm mb-4">
                This resource is an external link. To generate flashcards, podcasts, or mind maps,
                the content needs to be imported first.
              </p>
              {resource.external_url && (
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Resource
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {contentTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.id

                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className={cn(
                        'p-3 rounded-lg bg-gradient-to-br text-white',
                        type.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className={cn(
                          'font-semibold',
                          isSelected ? 'text-indigo-700' : 'text-slate-900'
                        )}>
                          {type.title}
                        </h3>
                        <p className="text-sm text-slate-600">{type.description}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto">
                          <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <ChevronRight className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedType || generating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
