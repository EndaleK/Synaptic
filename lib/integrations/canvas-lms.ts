/**
 * Canvas LMS Integration
 *
 * Allows users to:
 * - Import assignments and materials from Canvas
 * - Export flashcards as Canvas modules/pages
 * - Sync grades and progress
 */

// Canvas API Types
export interface CanvasConfig {
  baseUrl: string // e.g., 'https://canvas.instructure.com'
  accessToken: string
}

export interface CanvasCourse {
  id: number
  name: string
  course_code: string
  enrollment_term_id?: number
  start_at?: string
  end_at?: string
  workflow_state: 'available' | 'completed' | 'deleted' | 'unpublished'
  total_students?: number
  enrollments?: CanvasEnrollment[]
}

export interface CanvasEnrollment {
  type: 'student' | 'teacher' | 'ta' | 'designer' | 'observer'
  role: string
  enrollment_state: 'active' | 'invited' | 'inactive' | 'completed'
}

export interface CanvasAssignment {
  id: number
  name: string
  description?: string
  due_at?: string
  points_possible?: number
  course_id: number
  submission_types: string[]
  workflow_state: 'published' | 'unpublished' | 'deleted'
  html_url: string
  has_submitted_submissions?: boolean
  rubric?: CanvasRubric[]
  allowed_extensions?: string[]
}

export interface CanvasRubric {
  id: string
  points: number
  description: string
  long_description?: string
  ratings: Array<{
    id: string
    points: number
    description: string
  }>
}

export interface CanvasModule {
  id: number
  name: string
  position: number
  workflow_state: 'active' | 'deleted'
  items_count: number
  items_url: string
  items?: CanvasModuleItem[]
}

export interface CanvasModuleItem {
  id: number
  module_id: number
  position: number
  title: string
  type: 'File' | 'Page' | 'Discussion' | 'Assignment' | 'Quiz' | 'SubHeader' | 'ExternalUrl' | 'ExternalTool'
  content_id?: number
  html_url?: string
  external_url?: string
}

export interface CanvasFile {
  id: number
  display_name: string
  filename: string
  content_type: string
  url: string
  size: number
  created_at: string
  updated_at: string
}

export interface CanvasPage {
  url: string
  title: string
  body: string
  published: boolean
  front_page: boolean
  created_at: string
  updated_at: string
  html_url: string
}

export interface CanvasSubmission {
  id: number
  assignment_id: number
  user_id: number
  grade?: string
  score?: number
  submitted_at?: string
  workflow_state: 'submitted' | 'unsubmitted' | 'graded' | 'pending_review'
  late?: boolean
  missing?: boolean
}

/**
 * Create Canvas API client
 */
export function createCanvasClient(config: CanvasConfig) {
  const { baseUrl, accessToken } = config

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${baseUrl}/api/v1${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Canvas API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  return {
    /**
     * Get current user's courses
     */
    async getCourses(): Promise<CanvasCourse[]> {
      return fetchWithAuth('/courses?include[]=total_students&include[]=enrollments&per_page=50')
    },

    /**
     * Get a specific course
     */
    async getCourse(courseId: number): Promise<CanvasCourse> {
      return fetchWithAuth(`/courses/${courseId}`)
    },

    /**
     * Get course assignments
     */
    async getAssignments(courseId: number): Promise<CanvasAssignment[]> {
      return fetchWithAuth(`/courses/${courseId}/assignments?per_page=100`)
    },

    /**
     * Get a specific assignment
     */
    async getAssignment(courseId: number, assignmentId: number): Promise<CanvasAssignment> {
      return fetchWithAuth(`/courses/${courseId}/assignments/${assignmentId}`)
    },

    /**
     * Get course modules
     */
    async getModules(courseId: number): Promise<CanvasModule[]> {
      return fetchWithAuth(`/courses/${courseId}/modules?include[]=items&per_page=50`)
    },

    /**
     * Get module items
     */
    async getModuleItems(courseId: number, moduleId: number): Promise<CanvasModuleItem[]> {
      return fetchWithAuth(`/courses/${courseId}/modules/${moduleId}/items?per_page=100`)
    },

    /**
     * Get course files
     */
    async getFiles(courseId: number): Promise<CanvasFile[]> {
      return fetchWithAuth(`/courses/${courseId}/files?per_page=100`)
    },

    /**
     * Get course pages
     */
    async getPages(courseId: number): Promise<CanvasPage[]> {
      return fetchWithAuth(`/courses/${courseId}/pages?per_page=100`)
    },

    /**
     * Get a specific page
     */
    async getPage(courseId: number, pageUrl: string): Promise<CanvasPage> {
      return fetchWithAuth(`/courses/${courseId}/pages/${pageUrl}`)
    },

    /**
     * Create a new page in a course
     */
    async createPage(courseId: number, page: {
      title: string
      body: string
      published?: boolean
    }): Promise<CanvasPage> {
      return fetchWithAuth(`/courses/${courseId}/pages`, {
        method: 'POST',
        body: JSON.stringify({
          wiki_page: {
            title: page.title,
            body: page.body,
            published: page.published ?? true
          }
        })
      })
    },

    /**
     * Create a module in a course
     */
    async createModule(courseId: number, module: {
      name: string
      position?: number
    }): Promise<CanvasModule> {
      return fetchWithAuth(`/courses/${courseId}/modules`, {
        method: 'POST',
        body: JSON.stringify({
          module: {
            name: module.name,
            position: module.position
          }
        })
      })
    },

    /**
     * Add an item to a module
     */
    async addModuleItem(courseId: number, moduleId: number, item: {
      title: string
      type: 'Page' | 'ExternalUrl'
      page_url?: string
      external_url?: string
      new_tab?: boolean
    }): Promise<CanvasModuleItem> {
      return fetchWithAuth(`/courses/${courseId}/modules/${moduleId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          module_item: {
            title: item.title,
            type: item.type,
            page_url: item.page_url,
            external_url: item.external_url,
            new_tab: item.new_tab ?? true
          }
        })
      })
    },

    /**
     * Get user's submissions for an assignment
     */
    async getSubmission(courseId: number, assignmentId: number, userId: number = 0): Promise<CanvasSubmission> {
      const userIdPath = userId ? `/${userId}` : '/self'
      return fetchWithAuth(`/courses/${courseId}/assignments/${assignmentId}/submissions${userIdPath}`)
    },

    /**
     * Get all submissions for an assignment (teacher only)
     */
    async getSubmissions(courseId: number, assignmentId: number): Promise<CanvasSubmission[]> {
      return fetchWithAuth(`/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100`)
    },

    /**
     * Test connection
     */
    async testConnection(): Promise<{ id: number; name: string; email: string }> {
      return fetchWithAuth('/users/self')
    }
  }
}

/**
 * Generate HTML content for a flashcard page
 */
export function generateFlashcardPageHtml(flashcards: Array<{
  front: string
  back: string
  tags?: string[]
}>): string {
  const cardsHtml = flashcards.map((card, index) => `
    <div class="flashcard" style="margin-bottom: 20px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
      <div style="margin-bottom: 10px;">
        <strong style="color: #333;">Question ${index + 1}:</strong>
        <p style="margin: 5px 0; color: #444;">${escapeHtml(card.front)}</p>
      </div>
      <div>
        <strong style="color: #333;">Answer:</strong>
        <p style="margin: 5px 0; color: #444;">${escapeHtml(card.back)}</p>
      </div>
      ${card.tags && card.tags.length > 0 ? `
        <div style="margin-top: 10px;">
          ${card.tags.map(tag => `<span style="display: inline-block; padding: 2px 8px; margin: 2px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; font-size: 12px;">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('\n')

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0;">📚 Flashcard Study Set</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${flashcards.length} cards • Created with Synaptic</p>
      </div>
      ${cardsHtml}
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p style="color: #666; margin: 0;">
          Study these flashcards interactively at
          <a href="https://synaptic.study" style="color: #667eea; text-decoration: none;">synaptic.study</a>
        </p>
      </div>
    </div>
  `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Export flashcards to Canvas as a page
 */
export async function exportFlashcardsToCanvas(
  client: ReturnType<typeof createCanvasClient>,
  options: {
    courseId: number
    title: string
    flashcards: Array<{ front: string; back: string; tags?: string[] }>
    moduleId?: number
  }
): Promise<{ page: CanvasPage; moduleItem?: CanvasModuleItem }> {
  const body = generateFlashcardPageHtml(options.flashcards)

  // Create the page
  const page = await client.createPage(options.courseId, {
    title: options.title,
    body,
    published: true
  })

  // Optionally add to a module
  let moduleItem: CanvasModuleItem | undefined
  if (options.moduleId) {
    moduleItem = await client.addModuleItem(options.courseId, options.moduleId, {
      title: options.title,
      type: 'Page',
      page_url: page.url
    })
  }

  return { page, moduleItem }
}
