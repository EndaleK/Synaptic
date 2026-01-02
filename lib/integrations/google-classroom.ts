/**
 * Google Classroom Integration
 *
 * Allows users to:
 * - Import assignments from Google Classroom
 * - Export flashcards as Google Classroom materials
 * - Sync study progress with Classroom grades
 */

import { google, classroom_v1 } from 'googleapis'

// Types for Google Classroom integration
export interface GoogleClassroomConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface GoogleClassroomCourse {
  id: string
  name: string
  section?: string
  description?: string
  room?: string
  ownerId: string
  creationTime?: string
  updateTime?: string
  enrollmentCode?: string
  courseState?: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED'
}

export interface GoogleClassroomAssignment {
  id: string
  courseId: string
  title: string
  description?: string
  materials?: GoogleClassroomMaterial[]
  state: 'DRAFT' | 'PUBLISHED' | 'DELETED'
  creationTime?: string
  updateTime?: string
  dueDate?: {
    year: number
    month: number
    day: number
  }
  dueTime?: {
    hours: number
    minutes: number
  }
  maxPoints?: number
  workType?: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
}

export interface GoogleClassroomMaterial {
  driveFile?: {
    driveFile: {
      id: string
      title: string
      alternateLink: string
      thumbnailUrl?: string
    }
    shareMode?: 'VIEW' | 'EDIT' | 'STUDENT_COPY'
  }
  youtubeVideo?: {
    id: string
    title: string
    alternateLink: string
    thumbnailUrl?: string
  }
  link?: {
    url: string
    title: string
    thumbnailUrl?: string
  }
  form?: {
    formUrl: string
    responseUrl?: string
    title: string
    thumbnailUrl?: string
  }
}

export interface GoogleClassroomStudent {
  userId: string
  profile: {
    id: string
    name: {
      givenName: string
      familyName: string
      fullName: string
    }
    emailAddress: string
    photoUrl?: string
  }
}

export interface GoogleClassroomSubmission {
  id: string
  courseId: string
  courseWorkId: string
  userId: string
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  assignedGrade?: number
  draftGrade?: number
  alternateLink?: string
  late?: boolean
}

/**
 * Create OAuth2 client for Google Classroom
 */
export function createOAuth2Client(config: GoogleClassroomConfig) {
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )
}

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthUrl(config: GoogleClassroomConfig): string {
  const oauth2Client = createOAuth2Client(config)

  const scopes = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.profile.emails',
    'https://www.googleapis.com/auth/classroom.profile.photos'
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: GoogleClassroomConfig,
  code: string
): Promise<{
  accessToken: string
  refreshToken?: string
  expiryDate?: number
}> {
  const oauth2Client = createOAuth2Client(config)
  const { tokens } = await oauth2Client.getToken(code)

  return {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || undefined,
    expiryDate: tokens.expiry_date || undefined
  }
}

/**
 * Create authenticated Classroom client
 */
export function createClassroomClient(
  config: GoogleClassroomConfig,
  accessToken: string,
  refreshToken?: string
): classroom_v1.Classroom {
  const oauth2Client = createOAuth2Client(config)
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  return google.classroom({ version: 'v1', auth: oauth2Client })
}

/**
 * Fetch user's courses
 */
export async function getCourses(
  classroom: classroom_v1.Classroom,
  options?: { teacherMode?: boolean }
): Promise<GoogleClassroomCourse[]> {
  const response = await classroom.courses.list({
    courseStates: ['ACTIVE'],
    ...(options?.teacherMode && { teacherId: 'me' })
  })

  return (response.data.courses || []).map(course => ({
    id: course.id || '',
    name: course.name || 'Untitled Course',
    section: course.section || undefined,
    description: course.descriptionHeading || undefined,
    room: course.room || undefined,
    ownerId: course.ownerId || '',
    creationTime: course.creationTime || undefined,
    updateTime: course.updateTime || undefined,
    enrollmentCode: course.enrollmentCode || undefined,
    courseState: course.courseState as GoogleClassroomCourse['courseState']
  }))
}

/**
 * Fetch assignments for a course
 */
export async function getCourseAssignments(
  classroom: classroom_v1.Classroom,
  courseId: string
): Promise<GoogleClassroomAssignment[]> {
  const response = await classroom.courses.courseWork.list({
    courseId,
    courseWorkStates: ['PUBLISHED']
  })

  return (response.data.courseWork || []).map(work => ({
    id: work.id || '',
    courseId: work.courseId || '',
    title: work.title || 'Untitled Assignment',
    description: work.description || undefined,
    materials: (work.materials || []).map(m => ({
      driveFile: m.driveFile ? {
        driveFile: {
          id: m.driveFile.driveFile?.id || '',
          title: m.driveFile.driveFile?.title || '',
          alternateLink: m.driveFile.driveFile?.alternateLink || '',
          thumbnailUrl: m.driveFile.driveFile?.thumbnailUrl || undefined
        },
        shareMode: m.driveFile.shareMode as 'VIEW' | 'EDIT' | 'STUDENT_COPY'
      } : undefined,
      youtubeVideo: m.youtubeVideo ? {
        id: m.youtubeVideo.id || '',
        title: m.youtubeVideo.title || '',
        alternateLink: m.youtubeVideo.alternateLink || '',
        thumbnailUrl: m.youtubeVideo.thumbnailUrl || undefined
      } : undefined,
      link: m.link ? {
        url: m.link.url || '',
        title: m.link.title || '',
        thumbnailUrl: m.link.thumbnailUrl || undefined
      } : undefined,
      form: m.form ? {
        formUrl: m.form.formUrl || '',
        responseUrl: m.form.responseUrl || undefined,
        title: m.form.title || '',
        thumbnailUrl: m.form.thumbnailUrl || undefined
      } : undefined
    })),
    state: work.state as 'DRAFT' | 'PUBLISHED' | 'DELETED',
    creationTime: work.creationTime || undefined,
    updateTime: work.updateTime || undefined,
    dueDate: work.dueDate ? {
      year: work.dueDate.year || 0,
      month: work.dueDate.month || 0,
      day: work.dueDate.day || 0
    } : undefined,
    dueTime: work.dueTime ? {
      hours: work.dueTime.hours || 0,
      minutes: work.dueTime.minutes || 0
    } : undefined,
    maxPoints: work.maxPoints || undefined,
    workType: work.workType as 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  }))
}

/**
 * Create a material in Google Classroom
 */
export async function createCourseMaterial(
  classroom: classroom_v1.Classroom,
  courseId: string,
  material: {
    title: string
    description?: string
    link: {
      url: string
      title: string
    }
    topicId?: string
  }
): Promise<{ id: string; alternateLink: string }> {
  const response = await classroom.courses.courseWorkMaterials.create({
    courseId,
    requestBody: {
      title: material.title,
      description: material.description,
      materials: [
        {
          link: {
            url: material.link.url,
            title: material.link.title
          }
        }
      ],
      topicId: material.topicId,
      state: 'PUBLISHED'
    }
  })

  return {
    id: response.data.id || '',
    alternateLink: response.data.alternateLink || ''
  }
}

/**
 * Get course topics
 */
export async function getCourseTopics(
  classroom: classroom_v1.Classroom,
  courseId: string
): Promise<Array<{ id: string; name: string }>> {
  const response = await classroom.courses.topics.list({
    courseId
  })

  return (response.data.topic || []).map(topic => ({
    id: topic.topicId || '',
    name: topic.name || 'Untitled Topic'
  }))
}

/**
 * Export flashcards as a classroom material
 */
export async function exportFlashcardsToClassroom(
  classroom: classroom_v1.Classroom,
  options: {
    courseId: string
    flashcardsUrl: string
    title: string
    description?: string
    topicId?: string
  }
): Promise<{ id: string; alternateLink: string }> {
  return createCourseMaterial(classroom, options.courseId, {
    title: options.title,
    description: options.description || 'Flashcard set from Synaptic',
    link: {
      url: options.flashcardsUrl,
      title: `Synaptic Flashcards: ${options.title}`
    },
    topicId: options.topicId
  })
}

/**
 * Get student submissions for an assignment
 */
export async function getSubmissions(
  classroom: classroom_v1.Classroom,
  courseId: string,
  courseWorkId: string
): Promise<GoogleClassroomSubmission[]> {
  const response = await classroom.courses.courseWork.studentSubmissions.list({
    courseId,
    courseWorkId
  })

  return (response.data.studentSubmissions || []).map(sub => ({
    id: sub.id || '',
    courseId: sub.courseId || '',
    courseWorkId: sub.courseWorkId || '',
    userId: sub.userId || '',
    state: sub.state as GoogleClassroomSubmission['state'],
    assignedGrade: sub.assignedGrade || undefined,
    draftGrade: sub.draftGrade || undefined,
    alternateLink: sub.alternateLink || undefined,
    late: sub.late || false
  }))
}

/**
 * Get course roster (students)
 */
export async function getCourseStudents(
  classroom: classroom_v1.Classroom,
  courseId: string
): Promise<GoogleClassroomStudent[]> {
  const response = await classroom.courses.students.list({
    courseId
  })

  return (response.data.students || []).map(student => ({
    userId: student.userId || '',
    profile: {
      id: student.profile?.id || '',
      name: {
        givenName: student.profile?.name?.givenName || '',
        familyName: student.profile?.name?.familyName || '',
        fullName: student.profile?.name?.fullName || ''
      },
      emailAddress: student.profile?.emailAddress || '',
      photoUrl: student.profile?.photoUrl || undefined
    }
  }))
}
