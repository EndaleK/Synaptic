'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Library,
  Upload,
  FileText,
  BookOpen,
  Video,
  Link2,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Users,
  School,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit2,
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
  visible_to_schools: string[]
  visible_to_classes: string[]
  tags: string[]
  curriculum_standards: Record<string, string[]>
  estimated_hours: number | null
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  organization?: { id: string; name: string }
  document?: { id: string; file_name: string; file_type: string }
  creator?: { id: number; full_name: string }
}

interface Organization {
  id: string
  name: string
  type: string
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

export default function SharedLibraryPage() {
  const router = useRouter()
  const [resources, setResources] = useState<SharedResource[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [filterGrade, setFilterGrade] = useState<number | null>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  useEffect(() => {
    if (selectedOrg) {
      fetchResources()
    }
  }, [selectedOrg])

  async function fetchOrganizations() {
    try {
      const res = await fetch('/api/organizations', { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setError('You need to be an organization admin to access the Shared Library.')
          return
        }
        throw new Error('Failed to fetch organizations')
      }
      const data = await res.json()
      const orgs = data.organizations || []
      setOrganizations(orgs)

      // Auto-select first org if available
      if (orgs.length > 0 && !selectedOrg) {
        setSelectedOrg(orgs[0].id)
      }
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  async function fetchResources() {
    if (!selectedOrg) return

    try {
      setLoading(true)
      const params = new URLSearchParams({ organizationId: selectedOrg })
      if (filterSubject) params.append('subject', filterSubject)
      if (filterGrade !== null) params.append('gradeLevel', String(filterGrade))
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/shared-resources?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch resources')

      const data = await res.json()
      setResources(data.resources || [])
    } catch (err) {
      console.error('Error fetching resources:', err)
      setError('Failed to load shared resources')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteResource(resourceId: string) {
    if (!confirm('Are you sure you want to delete this resource? This cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/shared-resources/${resourceId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to delete resource')

      setResources(resources.filter(r => r.id !== resourceId))
    } catch (err) {
      console.error('Error deleting resource:', err)
      alert('Failed to delete resource')
    }
  }

  async function handleToggleActive(resource: SharedResource) {
    try {
      const res = await fetch(`/api/shared-resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !resource.is_active }),
      })

      if (!res.ok) throw new Error('Failed to update resource')

      setResources(resources.map(r =>
        r.id === resource.id ? { ...r, is_active: !r.is_active } : r
      ))
    } catch (err) {
      console.error('Error updating resource:', err)
      alert('Failed to update resource')
    }
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

  if (loading && !selectedOrg) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error && !selectedOrg) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
          <p>{error}</p>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Only organization administrators can manage the shared resource library.
        </p>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center">
        <Library className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Organizations Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You need to be part of an organization to manage shared resources.
        </p>
        <button
          onClick={() => router.push('/dashboard/teacher/setup')}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Organization
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Library className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Shared Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage curriculum materials for your organization
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </button>
      </div>

      {/* Organization Selector */}
      {organizations.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization
          </label>
          <select
            value={selectedOrg || ''}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={filterSubject || ''}
          onChange={(e) => setFilterSubject(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Subjects</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>

        <select
          value={filterGrade ?? ''}
          onChange={(e) => setFilterGrade(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Grades</option>
          {GRADE_LEVELS.map((grade) => (
            <option key={grade.value} value={grade.value}>{grade.label}</option>
          ))}
        </select>

        <button
          onClick={() => fetchResources()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Resource Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Resources"
          value={resources.length}
          icon={Library}
          color="purple"
        />
        <StatCard
          label="Active"
          value={resources.filter(r => r.is_active).length}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Documents"
          value={resources.filter(r => r.document_id).length}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="External Links"
          value={resources.filter(r => r.external_url).length}
          icon={Link2}
          color="orange"
        />
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Library className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Resources Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start building your curriculum library by adding resources.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add First Resource
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDelete={() => handleDeleteResource(resource.id)}
                onToggleActive={() => handleToggleActive(resource)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && selectedOrg && (
        <AddResourceModal
          organizationId={selectedOrg}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchResources()
          }}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof Library
  color: 'purple' | 'green' | 'blue' | 'orange'
}) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

function ResourceCard({
  resource,
  onDelete,
  onToggleActive,
}: {
  resource: SharedResource
  onDelete: () => void
  onToggleActive: () => void
}) {
  const typeConfig = RESOURCE_TYPES.find(t => t.value === resource.resource_type) || RESOURCE_TYPES[0]
  const TypeIcon = typeConfig.icon

  return (
    <div className={cn(
      'p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
      !resource.is_active && 'opacity-60'
    )}>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <TypeIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {resource.title}
            </h3>
            {!resource.is_active && (
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded">
                Inactive
              </span>
            )}
          </div>

          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {resource.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {resource.subject && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                {resource.subject}
              </span>
            )}
            {resource.grade_levels.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                {resource.grade_levels.length === 1
                  ? GRADE_LEVELS.find(g => g.value === resource.grade_levels[0])?.label
                  : `Grades ${Math.min(...resource.grade_levels)}-${Math.max(...resource.grade_levels)}`}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
              {typeConfig.label}
            </span>
            {resource.visibility === 'all_members' && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                <Users className="h-3 w-3" />
                All Members
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resource.external_url && (
            <a
              href={resource.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Open link"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onToggleActive}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={resource.is_active ? 'Hide from members' : 'Show to members'}
          >
            {resource.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Delete resource"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddResourceModal({
  organizationId,
  onClose,
  onSuccess,
}: {
  organizationId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<'type' | 'details' | 'upload'>('type')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [resourceType, setResourceType] = useState<ResourceType>('document')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevels, setGradeLevels] = useState<number[]>([])
  const [externalUrl, setExternalUrl] = useState('')
  const [visibility, setVisibility] = useState<'all_members' | 'specific_classes'>('all_members')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Document upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setError(null)
  }

  const handleUploadDocument = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get signed URL
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || 'Failed to initiate upload')
      }

      const { signedUrl, documentId } = await uploadRes.json()

      // Step 2: Upload to storage
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      // Step 3: Complete upload
      const completeRes = await fetch(`/api/documents/${documentId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!completeRes.ok) {
        throw new Error('Failed to complete upload')
      }

      setUploadedDocId(documentId)
      setTitle(file.name.replace(/\.[^/.]+$/, '')) // Set title from filename
      setStep('details')
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!title) {
      setError('Title is required')
      return
    }

    if (resourceType === 'url' && !externalUrl) {
      setError('URL is required for external links')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/shared-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organizationId,
          title,
          description,
          resourceType,
          subject: subject || null,
          gradeLevels,
          documentId: uploadedDocId,
          externalUrl: resourceType === 'url' ? externalUrl : null,
          visibility,
          tags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create resource')
      }

      onSuccess()
    } catch (err) {
      console.error('Create error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create resource')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const toggleGradeLevel = (grade: number) => {
    if (gradeLevels.includes(grade)) {
      setGradeLevels(gradeLevels.filter(g => g !== grade))
    } else {
      setGradeLevels([...gradeLevels, grade].sort((a, b) => a - b))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Resource
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 'type' && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select the type of resource you want to add:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {RESOURCE_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = resourceType === type.value

                  return (
                    <button
                      key={type.value}
                      onClick={() => setResourceType(type.value)}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all text-left',
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <Icon className={cn(
                        'h-6 w-6 mb-2',
                        isSelected ? 'text-purple-600' : 'text-gray-400'
                      )} />
                      <span className={cn(
                        'font-medium',
                        isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {type.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    if (resourceType === 'url') {
                      setStep('details')
                    } else {
                      setStep('upload')
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload a document to share with your organization members.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  file
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, DOCX, TXT, or MD files up to 500MB
                    </p>
                  </>
                )}
              </div>

              {loading && uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep('type')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={!file || loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      Upload & Continue
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Grade 5 Math Workbook"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this resource..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* External URL (if type is url) */}
              {resourceType === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a subject...</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Grade Levels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade Levels
                </label>
                <div className="flex flex-wrap gap-2">
                  {GRADE_LEVELS.map((grade) => (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => toggleGradeLevel(grade.value)}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm transition-colors',
                        gradeLevels.includes(grade.value)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibility
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="visibility"
                      value="all_members"
                      checked={visibility === 'all_members'}
                      onChange={() => setVisibility('all_members')}
                      className="text-purple-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">All Members</p>
                      <p className="text-sm text-gray-500">Visible to all organization members</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <input
                      type="radio"
                      name="visibility"
                      value="specific_classes"
                      checked={visibility === 'specific_classes'}
                      onChange={() => setVisibility('specific_classes')}
                      className="text-purple-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Specific Classes</p>
                      <p className="text-sm text-gray-500">Only visible to selected classes</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep(resourceType === 'url' ? 'type' : 'upload')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !title}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Resource
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
