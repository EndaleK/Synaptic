// ============================================================================
// INSTITUTIONAL TYPES
// Types for multi-tenancy, organizations, schools, classes, and assignments
// ============================================================================

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export type OrganizationType = 'k12_district' | 'university' | 'corporate' | 'other'
export type OrganizationTier = 'pilot' | 'basic' | 'professional' | 'enterprise'

export interface OrganizationAddress {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

export interface SSOConfig {
  enabled: boolean
  provider: 'google' | 'azure' | 'okta' | 'saml' | 'custom'
  entityId?: string
  ssoUrl?: string
  certificate?: string
  attributeMapping?: {
    email: string
    firstName: string
    lastName: string
    role?: string
    studentId?: string
  }
}

export interface OrganizationSettings {
  allowStudentSelfEnrollment?: boolean
  requireApprovalForResources?: boolean
  defaultClassMaxStudents?: number
  enabledFeatures?: {
    flashcards?: boolean
    podcasts?: boolean
    mindmaps?: boolean
    exams?: boolean
    studyGuides?: boolean
    chat?: boolean
  }
  branding?: {
    customLogo?: boolean
    customColors?: boolean
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  type: OrganizationType
  logoUrl?: string
  primaryColor: string
  secondaryColor: string

  // Contact
  adminEmail: string
  billingEmail?: string
  phone?: string
  address?: OrganizationAddress

  // Subscription
  subscriptionTier: OrganizationTier
  maxSeats: number
  currentSeats: number
  subscriptionStart?: Date
  subscriptionEnd?: Date
  stripeCustomerId?: string

  // Settings
  settings: OrganizationSettings
  ssoConfig?: SSOConfig

  // Compliance
  ferpaAgreementSigned: boolean
  dataRetentionDays: number

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SCHOOL TYPES
// ============================================================================

export type SchoolType = 'elementary' | 'middle' | 'high' | 'college' | 'other'

export interface SchoolSettings {
  timezone?: string
  academicYearStart?: string // MM-DD format
  gradingScale?: 'letter' | 'percentage' | 'points'
}

export interface School {
  id: string
  organizationId: string
  name: string
  slug: string
  type?: SchoolType
  address?: OrganizationAddress
  principalName?: string
  principalEmail?: string
  settings: SchoolSettings
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// MEMBER & ROLE TYPES
// ============================================================================

export type OrganizationRole =
  | 'org_admin'           // Full org access (superintendent, IT admin)
  | 'school_admin'        // School-level admin (principal)
  | 'teacher'             // Can create classes, view own students
  | 'teaching_assistant'  // Limited teacher access
  | 'student'             // Basic access

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  schoolId?: string // NULL = district-wide access
  role: OrganizationRole
  title?: string
  department?: string
  invitedBy?: string
  invitedAt: Date
  acceptedAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationInvite {
  id: string
  organizationId: string
  schoolId?: string
  email: string
  role: OrganizationRole
  inviteCode: string
  invitedBy?: string
  expiresAt: Date
  acceptedAt?: Date
  acceptedBy?: string
  createdAt: Date
}

// ============================================================================
// CLASS TYPES
// ============================================================================

export type Semester = 'fall' | 'spring' | 'summer' | 'full_year'

export interface ClassSettings {
  allowLateSubmissions?: boolean
  defaultDueDays?: number
  showLeaderboard?: boolean
  enablePeerLearning?: boolean
}

export interface Class {
  id: string
  schoolId: string
  teacherId?: string
  name: string
  subject?: string
  gradeLevel?: string
  sectionCode?: string
  description?: string

  // Enrollment
  joinCode: string
  maxStudents: number
  allowSelfEnrollment: boolean
  isArchived: boolean

  // Schedule
  academicYear?: string
  semester?: Semester
  startDate?: Date
  endDate?: Date

  settings: ClassSettings
  createdAt: Date
  updatedAt: Date
}

export type EnrollmentStatus = 'active' | 'dropped' | 'completed'

export interface ClassEnrollment {
  id: string
  classId: string
  studentId: string
  enrolledAt: Date
  enrolledBy?: string
  status: EnrollmentStatus
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ASSIGNMENT TYPES
// ============================================================================

export type AssignmentType =
  | 'flashcards'
  | 'quiz'
  | 'exam'
  | 'reading'
  | 'podcast'
  | 'mindmap'
  | 'study_guide'

export interface Assignment {
  id: string
  classId: string
  createdBy?: string
  title: string
  description?: string
  instructions?: string
  type: AssignmentType

  // Linked content
  documentId?: string
  examId?: string

  // Requirements
  dueDate?: Date
  minCardsToReview?: number
  minScorePercent?: number
  requiredTimeMinutes?: number

  // Settings
  allowLateSubmission: boolean
  maxAttempts?: number
  showAnswersAfterDue: boolean

  isPublished: boolean
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded'

export interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  status: SubmissionStatus

  // Progress
  startedAt?: Date
  submittedAt?: Date
  timeSpentSeconds: number

  // Results
  scorePercent?: number
  cardsReviewed?: number
  cardsMastered?: number
  attemptNumber: number
  examAttemptId?: string

  // Feedback
  feedback?: string
  gradedBy?: string
  gradedAt?: Date

  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// CURRICULUM TYPES
// ============================================================================

export type ResourceVisibility = 'private' | 'school' | 'organization'

export interface StandardAlignment {
  code: string        // e.g., "CCSS.MATH.8.G.1"
  description: string
  framework?: string  // "Common Core", "NGSS", etc.
}

export interface CurriculumResource {
  id: string
  organizationId: string
  schoolId?: string
  documentId: string
  title: string
  description?: string
  subject?: string
  gradeLevels: string[]
  standards?: StandardAlignment[]
  visibility: ResourceVisibility
  createdBy?: string
  approvedBy?: string
  approvedAt?: Date
  usageCount: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type AuditAction =
  | 'view_student_data'
  | 'export_report'
  | 'modify_grade'
  | 'create_assignment'
  | 'delete_class'
  | 'invite_member'
  | 'remove_member'
  | 'change_role'
  | 'access_curriculum'
  | 'bulk_import'

export type AuditResourceType =
  | 'student'
  | 'class'
  | 'assignment'
  | 'submission'
  | 'organization'
  | 'school'
  | 'member'
  | 'curriculum'

export interface AuditLog {
  id: string
  organizationId?: string
  userId?: string
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface ClassAnalytics {
  classId: string
  period: 'day' | 'week' | 'month' | 'semester'

  // Engagement
  activeStudents: number
  totalStudents: number
  avgSessionsPerStudent: number
  avgTimePerSessionMinutes: number

  // Performance
  avgFlashcardAccuracy: number
  avgQuizScore: number
  masteryRate: number

  // Progress
  assignmentsCompleted: number
  assignmentsPending: number
  onTimeSubmissionRate: number

  // Trends
  performanceTrend: 'improving' | 'stable' | 'declining'
  engagementTrend: 'improving' | 'stable' | 'declining'
}

export interface StudentClassAnalytics {
  studentId: string
  classId: string

  // Study habits
  totalStudyTimeMinutes: number
  avgDailyStudyTimeMinutes: number
  lastActiveAt?: Date
  streakDays: number

  // Performance by topic
  topicPerformance: {
    topic: string
    accuracy: number
    mastery: 'not_started' | 'learning' | 'reviewing' | 'mastered'
  }[]

  // Spaced repetition
  cardsLearned: number
  cardsDue: number
  retentionRate: number

  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateOrganizationRequest {
  name: string
  slug: string
  type: OrganizationType
  adminEmail: string
  billingEmail?: string
}

export interface CreateSchoolRequest {
  organizationId: string
  name: string
  slug: string
  type?: SchoolType
  principalName?: string
  principalEmail?: string
}

export interface CreateClassRequest {
  schoolId: string
  name: string
  subject?: string
  gradeLevel?: string
  sectionCode?: string
  description?: string
  academicYear?: string
  semester?: Semester
  maxStudents?: number
}

export interface JoinClassRequest {
  joinCode: string
}

export interface CreateAssignmentRequest {
  classId: string
  title: string
  description?: string
  instructions?: string
  type: AssignmentType
  documentId?: string
  examId?: string
  dueDate?: string // ISO date string
  minCardsToReview?: number
  minScorePercent?: number
  requiredTimeMinutes?: number
  allowLateSubmission?: boolean
  maxAttempts?: number
}

export interface InviteMemberRequest {
  organizationId: string
  schoolId?: string
  email: string
  role: OrganizationRole
  title?: string
  department?: string
}

export interface BulkImportUsersRequest {
  organizationId: string
  schoolId?: string
  role: OrganizationRole
  users: {
    email: string
    firstName: string
    lastName: string
    studentId?: string
  }[]
}

export interface BulkImportResult {
  created: number
  updated: number
  errors: {
    email: string
    error: string
  }[]
}
