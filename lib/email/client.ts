/**
 * Email Service Client
 *
 * Centralized email sending utility using Resend
 */

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not set. Email functionality will be disabled.')
}

// Conditionally create Resend client only if API key is available
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/**
 * Email addresses configuration
 */
export const EMAIL_CONFIG = {
  from: {
    hello: 'Synaptic™ <hello@synaptic.study>',
    support: 'Synaptic™ Support <support@synaptic.study>',
  },
  replyTo: 'support@synaptic.study',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

/**
 * Email types for tracking and categorization
 */
export enum EmailType {
  WELCOME = 'welcome',
  SUBSCRIPTION_CONFIRMED = 'subscription_confirmed',
  PAYMENT_RECEIPT = 'payment_receipt',
  PAYMENT_FAILED = 'payment_failed',
  USAGE_WARNING = 'usage_warning',
  STUDY_REMINDER = 'study_reminder',
  STREAK_MILESTONE = 'streak_milestone',
  DOCUMENT_PROCESSED = 'document_processed',
  SUPPORT_RESPONSE = 'support_response',
  DAILY_DIGEST = 'daily_digest',
}

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Send email with automatic error handling and logging
 */
export async function sendEmail({
  to,
  subject,
  html,
  react,
  from = EMAIL_CONFIG.from.hello,
  replyTo = EMAIL_CONFIG.replyTo,
  emailType,
}: {
  to: string | string[]
  subject: string
  html?: string
  react?: React.ReactElement
  from?: string
  replyTo?: string
  emailType?: EmailType
}) {
  if (!isEmailConfigured() || !resend) {
    console.warn(`⚠️ Email not sent (RESEND_API_KEY not configured): ${subject} to ${to}`)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
      react,
      replyTo,
    })

    console.log(`✅ Email sent: ${emailType || 'unknown'} to ${to}`)

    return { success: true, data: response.data, error: null }
  } catch (error) {
    console.error('❌ Email send failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }
  }
}
