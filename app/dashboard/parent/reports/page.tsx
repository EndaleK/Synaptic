'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  FileText,
  Download,
  Plus,
  ChevronLeft,
  Calendar,
  User,
  Clock,
  Target,
  Brain,
  Flame,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react'

// Dynamic import for PDF to avoid SSR issues
const ProgressReportPDF = dynamic(() => import('@/components/ProgressReportPDF'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-slate-200 h-96 rounded-lg" />,
})

interface Student {
  id: number
  name: string
  email: string
}

interface Report {
  id: string
  title: string
  report_type: string
  period_start: string
  period_end: string
  pdf_url: string | null
  status: string
  shared_with_guardians: boolean
  created_at: string
  student: Student
  report_data?: ReportData
}

interface ReportData {
  student: { name: string; id: string }
  period: { start: string; end: string; type: string }
  attendance: { totalDays: number; activeDays: number; attendanceRate: number }
  flashcards: { totalReviewed: number; accuracy: number; mastered: number; learning: number }
  studyTime: { totalMinutes: number; averageDailyMinutes: number; byMode: Record<string, number> }
  assignments: { completed: number; total: number; averageScore: number; onTimeRate: number }
  streaks: { current: number; longest: number }
  generatedAt: string
}

interface LinkedStudent {
  id: number
  full_name: string
  email: string
}

export default function ParentReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    studentId: '',
    reportType: 'monthly',
    periodStart: '',
    periodEnd: '',
  })
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showPDFPreview, setShowPDFPreview] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch linked students
      const studentsRes = await fetch('/api/student-guardians?role=parent', {
        credentials: 'include',
      })

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        const students = studentsData.guardianships?.map((g: any) => ({
          id: g.student.id,
          full_name: g.student.full_name,
          email: g.student.email,
        })) || []
        setLinkedStudents(students)

        // Fetch reports for all linked students
        const allReports: Report[] = []
        for (const student of students) {
          const reportsRes = await fetch(`/api/progress-reports?studentId=${student.id}`, {
            credentials: 'include',
          })
          if (reportsRes.ok) {
            const reportsData = await reportsRes.json()
            allReports.push(...(reportsData.reports || []))
          }
        }

        // Sort by created_at descending
        allReports.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setReports(allReports)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReport(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setGenerateError(null)

    try {
      const res = await fetch('/api/progress-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(generateForm),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      // Refresh reports list
      await fetchData()
      setShowGenerateModal(false)
      setGenerateForm({
        studentId: '',
        reportType: 'monthly',
        periodStart: '',
        periodEnd: '',
      })

      // Show the newly generated report
      if (data.report) {
        setSelectedReport({ ...data.report, report_data: data.reportData })
        setShowPDFPreview(true)
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function getReportTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      monthly: 'Monthly Report',
      quarterly: 'Quarterly Report',
      semester: 'Semester Report',
      annual: 'Annual Report',
      custom: 'Custom Report',
    }
    return labels[type] || type
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-gray-100 text-gray-600',
    }
    return styles[status] || styles.draft
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading reports...</p>
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
                onClick={() => router.push('/dashboard/parent')}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Progress Reports</h1>
                <p className="text-sm text-slate-600">
                  Generate and view student progress reports
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={linkedStudents.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Generate Report
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

        {linkedStudents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Students Linked</h3>
            <p className="text-slate-600 mb-6">
              Link students to your account to generate progress reports.
            </p>
            <button
              onClick={() => router.push('/dashboard/parent')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Link a Student
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Reports Yet</h3>
            <p className="text-slate-600 mb-6">
              Generate your first progress report to track your child&apos;s learning journey.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Generate First Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <FileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {report.student?.full_name || 'Unknown Student'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(report.period_start)} - {formatDate(report.period_end)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {getReportTypeLabel(report.report_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report)
                        setShowPDFPreview(true)
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(report)
                        setShowPDFPreview(true)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Generate Progress Report</h2>
              <button
                onClick={() => {
                  setShowGenerateModal(false)
                  setGenerateError(null)
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Student
                </label>
                <select
                  required
                  value={generateForm.studentId}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, studentId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a student...</option>
                  {linkedStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || student.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Report Type
                </label>
                <select
                  value={generateForm.reportType}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, reportType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="monthly">Monthly Report</option>
                  <option value="quarterly">Quarterly Report</option>
                  <option value="semester">Semester Report</option>
                  <option value="annual">Annual Report</option>
                  <option value="custom">Custom Period</option>
                </select>
              </div>

              {generateForm.reportType === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={generateForm.periodStart}
                      onChange={(e) =>
                        setGenerateForm({ ...generateForm, periodStart: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={generateForm.periodEnd}
                      onChange={(e) =>
                        setGenerateForm({ ...generateForm, periodEnd: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {generateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {generateError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false)
                    setGenerateError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPDFPreview && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedReport.title}</h2>
              <button
                onClick={() => {
                  setShowPDFPreview(false)
                  setSelectedReport(null)
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <ProgressReportPDF
                reportData={selectedReport.report_data || null}
                reportTitle={selectedReport.title}
                periodStart={selectedReport.period_start}
                periodEnd={selectedReport.period_end}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
