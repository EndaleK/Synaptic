'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  BookOpen,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Target,
  AlertCircle,
  X,
  GripVertical,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface CurriculumUnit {
  id: string
  title: string
  description: string | null
  subject: string | null
  standards: string[]
  start_date: string | null
  end_date: string | null
  order_index: number
  is_required: boolean
  estimated_hours: number | null
  created_at: string
}

interface ClassInfo {
  id: string
  name: string
  subject: string | null
}

export default function TeacherCurriculumPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.classId as string

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [units, setUnits] = useState<CurriculumUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState<CurriculumUnit | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    standards: '',
    startDate: '',
    endDate: '',
    isRequired: true,
    estimatedHours: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [classId])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch class info
      const classRes = await fetch(`/api/classes/${classId}`, {
        credentials: 'include',
      })

      if (classRes.ok) {
        const classData = await classRes.json()
        setClassInfo(classData.class)
      }

      // Fetch curriculum units
      const unitsRes = await fetch(`/api/curriculum-units?classId=${classId}`, {
        credentials: 'include',
      })

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json()
        setUnits(unitsData.units || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingUnit(null)
    setFormData({
      title: '',
      description: '',
      subject: classInfo?.subject || '',
      standards: '',
      startDate: '',
      endDate: '',
      isRequired: true,
      estimatedHours: '',
    })
    setFormError(null)
    setShowAddModal(true)
  }

  function openEditModal(unit: CurriculumUnit) {
    setEditingUnit(unit)
    setFormData({
      title: unit.title,
      description: unit.description || '',
      subject: unit.subject || '',
      standards: unit.standards?.join(', ') || '',
      startDate: unit.start_date?.split('T')[0] || '',
      endDate: unit.end_date?.split('T')[0] || '',
      isRequired: unit.is_required,
      estimatedHours: unit.estimated_hours?.toString() || '',
    })
    setFormError(null)
    setShowAddModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const payload = {
        classId,
        title: formData.title,
        description: formData.description || null,
        subject: formData.subject || null,
        standards: formData.standards
          ? formData.standards.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        isRequired: formData.isRequired,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
      }

      const res = await fetch('/api/curriculum-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save unit')
      }

      // Refresh units
      await fetchData()
      setShowAddModal(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save unit')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(unitId: string) {
    if (!confirm('Are you sure you want to delete this curriculum unit?')) {
      return
    }

    try {
      const res = await fetch(`/api/curriculum-units/${unitId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setUnits(units.filter(u => u.id !== unitId))
      }
    } catch (err) {
      console.error('Failed to delete unit:', err)
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading curriculum...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Curriculum Units</h1>
                <p className="text-sm text-slate-600">
                  {classInfo?.name || 'Class'} • Manage year-long curriculum
                </p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Unit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {units.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Curriculum Units</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Create curriculum units to organize your course content and track student progress through the year.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create First Unit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Total Units</p>
                <p className="text-2xl font-bold text-slate-900">{units.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Required</p>
                <p className="text-2xl font-bold text-slate-900">
                  {units.filter(u => u.is_required).length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Total Hours</p>
                <p className="text-2xl font-bold text-slate-900">
                  {units.reduce((sum, u) => sum + (u.estimated_hours || 0), 0)}h
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Standards</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Set(units.flatMap(u => u.standards || [])).size}
                </p>
              </div>
            </div>

            {/* Units List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {units.map((unit, index) => (
                  <div
                    key={unit.id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag Handle & Index */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-slate-300 cursor-move" />
                        <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {unit.order_index + 1}
                        </span>
                      </div>

                      {/* Unit Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-slate-900">
                            {unit.title}
                          </h4>
                          {unit.is_required && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              Required
                            </span>
                          )}
                        </div>

                        {unit.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {unit.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          {unit.subject && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              {unit.subject}
                            </span>
                          )}
                          {(unit.start_date || unit.end_date) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(unit.start_date)} - {formatDate(unit.end_date)}
                            </span>
                          )}
                          {unit.estimated_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              ~{unit.estimated_hours}h
                            </span>
                          )}
                        </div>

                        {/* Standards */}
                        {unit.standards && unit.standards.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {unit.standards.map((standard, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                              >
                                {standard}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(unit)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingUnit ? 'Edit Curriculum Unit' : 'Add Curriculum Unit'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Introduction to Algebra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of what this unit covers..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Standards (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.standards}
                  onChange={(e) => setFormData({ ...formData, standards: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., CCSS.MATH.3.OA.A.1, CCSS.MATH.3.OA.A.2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter curriculum standards this unit addresses
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label htmlFor="isRequired" className="text-sm text-slate-700">
                  This is a required unit
                </label>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingUnit ? 'Update Unit' : 'Create Unit'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
