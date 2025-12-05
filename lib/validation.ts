/**
 * Input Validation Schemas
 *
 * Centralized validation using Zod for type safety and security
 */

import { z } from 'zod'

/**
 * File upload validation
 */
export const FileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(500 * 1024 * 1024), // 500MB max (for large textbooks)
  type: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain',
    'text/markdown', // .md
    'application/json',
  ]),
})

/**
 * URL import validation
 */
export const URLImportSchema = z.object({
  url: z.string().url().max(2048),
})

/**
 * Chat message validation
 */
export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  documentId: z.string().uuid().optional(),
  mode: z.enum(['direct', 'socratic', 'guided', 'mixed']).optional(),
})

/**
 * Flashcard generation validation
 */
export const FlashcardGenerationSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(5).max(50).optional(),
})

/**
 * Podcast generation validation
 */
export const PodcastGenerationSchema = z.object({
  documentId: z.string().uuid(),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
  language: z.enum(['en-us', 'en-gb', 'ja', 'zh', 'es', 'fr', 'hi', 'it', 'pt-br']).optional(),
  format: z.enum(['deep-dive', 'brief', 'critique', 'debate']).optional(),
  customPrompt: z.string().optional(),
  targetDuration: z.number().min(1).max(60).optional(),
})

/**
 * Mind map generation validation
 */
export const MindMapGenerationSchema = z.object({
  documentId: z.string().uuid(),
  maxNodes: z.number().int().min(5).max(100).optional(),
  maxDepth: z.number().int().min(2).max(6).optional(),
})

/**
 * Learning profile validation
 */
export const LearningProfileSchema = z.object({
  quizResponses: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })).min(1).max(50),
})

/**
 * User profile update validation
 */
export const UserProfileUpdateSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading_writing', 'mixed']).optional(),
  preferredMode: z.enum(['flashcards', 'chat', 'podcast', 'mindmap']).optional(),
})

/**
 * Age verification validation (COPPA compliance)
 */
export const AgeVerificationSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  parentalConsent: z.boolean().optional(),
})

/**
 * Generic pagination validation
 */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})

/**
 * Validate and sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove potentially dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .substring(0, 255)
}

/**
 * Validate file extension against MIME type
 */
export function validateFileExtension(fileName: string, mimeType: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase()

  const validExtensions: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/msword': ['doc'],
    'text/plain': ['txt', 'md'], // .md files may be reported as text/plain by some browsers
    'text/markdown': ['md'],
    'application/json': ['json'],
  }

  const allowed = validExtensions[mimeType]
  return allowed ? allowed.includes(extension || '') : false
}

/**
 * Validate document content length
 */
export function validateDocumentLength(content: string): {
  valid: boolean
  reason?: string
} {
  const MAX_LENGTH = 5000000 // 5M characters (~1.25M tokens, supports large textbooks)
  const MIN_LENGTH = 10

  if (content.length < MIN_LENGTH) {
    return {
      valid: false,
      reason: 'Document is too short. Must be at least 10 characters.',
    }
  }

  if (content.length > MAX_LENGTH) {
    return {
      valid: false,
      reason: 'Document is too long. Maximum 5,000,000 characters allowed.',
    }
  }

  return { valid: true }
}

/**
 * Check for potentially malicious content
 */
export function validateContentSafety(content: string): {
  safe: boolean
  reason?: string
} {
  // Check for script tags (XSS attempt)
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
    return {
      safe: false,
      reason: 'Content contains potentially malicious script tags.',
    }
  }

  // Check for iframe tags
  if (/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi.test(content)) {
    return {
      safe: false,
      reason: 'Content contains potentially malicious iframe tags.',
    }
  }

  // Check for unusual binary content
  const nonPrintableRatio = (content.match(/[^\x20-\x7E\n\r\t]/g) || []).length / content.length
  if (nonPrintableRatio > 0.3) {
    return {
      safe: false,
      reason: 'Content contains too many non-printable characters.',
    }
  }

  return { safe: true }
}

/**
 * Validate URL is from allowed domains
 */
export function validateImportURL(url: string): {
  valid: boolean
  type?: 'arxiv' | 'youtube' | 'web' | 'medium' | 'pdf-url'
  reason?: string
} {
  try {
    const parsedURL = new URL(url)

    // Check for common malicious patterns
    if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
      return {
        valid: false,
        reason: 'Only HTTP and HTTPS URLs are allowed.',
      }
    }

    // Block local/private IP ranges
    const hostname = parsedURL.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return {
        valid: false,
        reason: 'Local URLs are not allowed for security reasons.',
      }
    }

    // Detect source type
    if (hostname.includes('arxiv.org')) {
      return { valid: true, type: 'arxiv' }
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { valid: true, type: 'youtube' }
    }

    if (hostname.includes('medium.com')) {
      return { valid: true, type: 'medium' }
    }

    if (url.endsWith('.pdf')) {
      return { valid: true, type: 'pdf-url' }
    }

    // General web article
    return { valid: true, type: 'web' }
  } catch (error) {
    return {
      valid: false,
      reason: 'Invalid URL format.',
    }
  }
}

/**
 * Calculate age from birth date (for COPPA compliance)
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Validate user is 13+ (COPPA requirement)
 */
export function validateAge(birthDate: string): {
  valid: boolean
  age: number
  requiresParentalConsent: boolean
} {
  const age = calculateAge(birthDate)

  return {
    valid: age >= 13,
    age,
    requiresParentalConsent: age < 13,
  }
}
