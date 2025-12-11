'use client'

import { useMemo } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Font,
} from '@react-pdf/renderer'

// Register fonts (using system fonts that react-pdf supports)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
})

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

interface ProgressReportPDFProps {
  reportData: ReportData | null
  reportTitle: string
  periodStart: string
  periodEnd: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  studentInfo: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 5,
  },
  periodText: {
    fontSize: 11,
    color: '#64748B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '48%',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statUnit: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#475569',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  highlight: {
    color: '#4F46E5',
  },
  summary: {
    padding: 15,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    marginTop: 15,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
})

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    monthly: 'Monthly Progress Report',
    quarterly: 'Quarterly Progress Report',
    semester: 'Semester Progress Report',
    annual: 'Annual Progress Report',
    custom: 'Progress Report',
  }
  return labels[type] || 'Progress Report'
}

// PDF Document Component
function ProgressReportDocument({ reportData, reportTitle, periodStart, periodEnd }: ProgressReportPDFProps) {
  if (!reportData) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>No report data available</Text>
        </Page>
      </Document>
    )
  }

  const { student, period, attendance, flashcards, studyTime, assignments, streaks } = reportData

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{reportTitle || getReportTypeLabel(period.type)}</Text>
          <Text style={styles.subtitle}>Generated by Synaptic Learning Platform</Text>
        </View>

        {/* Student Info */}
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.periodText}>
            Report Period: {formatDate(periodStart || period.start)} - {formatDate(periodEnd || period.end)}
          </Text>
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Attendance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Active Study Days</Text>
              <Text style={styles.statValue}>{attendance.activeDays}</Text>
              <Text style={styles.statUnit}>out of {attendance.totalDays} days</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${attendance.attendanceRate}%` }]} />
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Attendance Rate</Text>
              <Text style={styles.statValue}>{attendance.attendanceRate}%</Text>
              <Text style={styles.statUnit}>consistency score</Text>
            </View>
          </View>
        </View>

        {/* Study Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Time</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Study Time</Text>
              <Text style={styles.statValue}>{formatTime(studyTime.totalMinutes)}</Text>
              <Text style={styles.statUnit}>during this period</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Daily Average</Text>
              <Text style={styles.statValue}>{studyTime.averageDailyMinutes}</Text>
              <Text style={styles.statUnit}>minutes per day</Text>
            </View>
          </View>
        </View>

        {/* Flashcard Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flashcard Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cards Reviewed</Text>
              <Text style={styles.statValue}>{flashcards.totalReviewed}</Text>
              <Text style={styles.statUnit}>total reviews</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Accuracy Rate</Text>
              <Text style={styles.statValue}>{flashcards.accuracy}%</Text>
              <Text style={styles.statUnit}>correct answers</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${flashcards.accuracy}%` }]} />
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Cards Mastered</Text>
              <Text style={styles.statValue}>{flashcards.mastered}</Text>
              <Text style={styles.statUnit}>fully learned</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Still Learning</Text>
              <Text style={styles.statValue}>{flashcards.learning}</Text>
              <Text style={styles.statUnit}>in progress</Text>
            </View>
          </View>
        </View>

        {/* Assignments (if applicable) */}
        {(assignments.completed > 0 || assignments.total > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignments</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{assignments.completed}</Text>
                <Text style={styles.statUnit}>of {assignments.total} assignments</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Average Score</Text>
                <Text style={styles.statValue}>{assignments.averageScore || 'N/A'}%</Text>
                <Text style={styles.statUnit}>on graded work</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>On-Time Rate</Text>
                <Text style={styles.statValue}>{assignments.onTimeRate}%</Text>
                <Text style={styles.statUnit}>submitted before deadline</Text>
              </View>
            </View>
          </View>
        )}

        {/* Study Streaks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Streaks</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Streak</Text>
              <Text style={styles.statValue}>{streaks.current}</Text>
              <Text style={styles.statUnit}>consecutive days</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Longest Streak</Text>
              <Text style={styles.statValue}>{streaks.longest}</Text>
              <Text style={styles.statUnit}>record days</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            During this reporting period, {student.name} studied for a total of {formatTime(studyTime.totalMinutes)} across {attendance.activeDays} active days, achieving an attendance rate of {attendance.attendanceRate}%.
            {flashcards.totalReviewed > 0 && ` Flashcard review shows ${flashcards.accuracy}% accuracy with ${flashcards.mastered} cards mastered.`}
            {streaks.current > 0 && ` Currently maintaining a ${streaks.current}-day study streak.`}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated on {formatDate(reportData.generatedAt)}
          </Text>
          <Text style={styles.footerText}>
            Synaptic Learning Platform
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Main component with download functionality
export default function ProgressReportPDF({ reportData, reportTitle, periodStart, periodEnd }: ProgressReportPDFProps) {
  const fileName = useMemo(() => {
    const studentName = reportData?.student?.name?.replace(/\s+/g, '-') || 'student'
    const date = new Date().toISOString().split('T')[0]
    return `progress-report-${studentName}-${date}.pdf`
  }, [reportData])

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">No report data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        {/* Student Header */}
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">{reportTitle}</h2>
          <p className="text-slate-600">{reportData.student.name}</p>
          <p className="text-sm text-slate-500">
            Period: {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Active Days</p>
            <p className="text-2xl font-bold text-slate-900">{reportData.attendance.activeDays}</p>
            <p className="text-xs text-slate-500">{reportData.attendance.attendanceRate}% attendance</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Study Time</p>
            <p className="text-2xl font-bold text-slate-900">{formatTime(reportData.studyTime.totalMinutes)}</p>
            <p className="text-xs text-slate-500">{reportData.studyTime.averageDailyMinutes} min/day avg</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Cards Reviewed</p>
            <p className="text-2xl font-bold text-slate-900">{reportData.flashcards.totalReviewed}</p>
            <p className="text-xs text-slate-500">{reportData.flashcards.accuracy}% accuracy</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500">Current Streak</p>
            <p className="text-2xl font-bold text-slate-900">{reportData.streaks.current}</p>
            <p className="text-xs text-slate-500">Best: {reportData.streaks.longest} days</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Flashcards */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Flashcard Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cards Mastered</span>
                <span className="font-medium">{reportData.flashcards.mastered}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Still Learning</span>
                <span className="font-medium">{reportData.flashcards.learning}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${reportData.flashcards.accuracy}%` }}
                />
              </div>
            </div>
          </div>

          {/* Assignments */}
          {(reportData.assignments.completed > 0 || reportData.assignments.total > 0) && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Assignments</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Completed</span>
                  <span className="font-medium">{reportData.assignments.completed} / {reportData.assignments.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Average Score</span>
                  <span className="font-medium">{reportData.assignments.averageScore || 'N/A'}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">On-Time Rate</span>
                  <span className="font-medium">{reportData.assignments.onTimeRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <PDFDownloadLink
          document={
            <ProgressReportDocument
              reportData={reportData}
              reportTitle={reportTitle}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          }
          fileName={fileName}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          {({ loading }) =>
            loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Preparing PDF...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF Report
              </>
            )
          }
        </PDFDownloadLink>
      </div>
    </div>
  )
}
