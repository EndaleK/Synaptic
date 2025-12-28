/**
 * Email Sending Helper Functions
 *
 * High-level functions to send specific email types
 */

import { sendEmail, EmailType, EMAIL_CONFIG } from './client'
import WelcomeEmail from './templates/welcome-email'
import PaymentReceiptEmail from './templates/payment-receipt-email'
import PaymentFailedEmail from './templates/payment-failed-email'
import SubscriptionConfirmedEmail from './templates/subscription-confirmed-email'
import UsageWarningEmail from './templates/usage-warning-email'
import DailyDigestEmail from './templates/daily-digest-email'

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail({
  userEmail,
  userName,
}: {
  userEmail: string
  userName?: string
}) {
  return sendEmail({
    to: userEmail,
    subject: 'Welcome to Synaptic™ - Your AI-Powered Learning Platform',
    react: WelcomeEmail({
      userName,
      userEmail,
      dashboardUrl: `${EMAIL_CONFIG.baseUrl}/dashboard`,
    }),
    from: EMAIL_CONFIG.from.hello,
    emailType: EmailType.WELCOME,
  })
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmedEmail({
  userEmail,
  userName,
  planName,
  billingInterval,
}: {
  userEmail: string
  userName?: string
  planName: string
  billingInterval: 'month' | 'year'
}) {
  return sendEmail({
    to: userEmail,
    subject: '🎉 Welcome to Synaptic™ Premium!',
    react: SubscriptionConfirmedEmail({
      userName,
      planName,
      billingInterval,
      dashboardUrl: `${EMAIL_CONFIG.baseUrl}/dashboard`,
    }),
    from: EMAIL_CONFIG.from.hello,
    emailType: EmailType.SUBSCRIPTION_CONFIRMED,
  })
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail({
  userEmail,
  userName,
  amountPaid,
  currency,
  planName,
  billingPeriodStart,
  billingPeriodEnd,
  invoiceUrl,
  cardLast4,
}: {
  userEmail: string
  userName?: string
  amountPaid: number
  currency: string
  planName: string
  billingPeriodStart: string
  billingPeriodEnd: string
  invoiceUrl?: string
  cardLast4?: string
}) {
  return sendEmail({
    to: userEmail,
    subject: 'Payment Receipt - Synaptic™ Subscription',
    react: PaymentReceiptEmail({
      userName,
      amountPaid,
      currency,
      planName,
      billingPeriodStart,
      billingPeriodEnd,
      invoiceUrl,
      cardLast4,
    }),
    from: EMAIL_CONFIG.from.hello,
    emailType: EmailType.PAYMENT_RECEIPT,
  })
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail({
  userEmail,
  userName,
  amountDue,
  currency,
  planName,
  retryDate,
  failureReason,
}: {
  userEmail: string
  userName?: string
  amountDue: number
  currency: string
  planName: string
  retryDate?: string
  failureReason?: string
}) {
  return sendEmail({
    to: userEmail,
    subject: 'Action Required: Payment Failed for Synaptic™ Subscription',
    react: PaymentFailedEmail({
      userName,
      amountDue,
      currency,
      planName,
      retryDate,
      updatePaymentUrl: `${EMAIL_CONFIG.baseUrl}/dashboard?tab=billing`,
      failureReason,
    }),
    from: EMAIL_CONFIG.from.support,
    emailType: EmailType.PAYMENT_FAILED,
  })
}

/**
 * Send usage warning email
 */
export async function sendUsageWarningEmail({
  userEmail,
  userName,
  usagePercentage,
  limitType,
  currentUsage,
  maxLimit,
}: {
  userEmail: string
  userName?: string
  usagePercentage: number
  limitType: string
  currentUsage: number
  maxLimit: number
}) {
  return sendEmail({
    to: userEmail,
    subject: `You've used ${usagePercentage}% of your monthly ${limitType} limit`,
    react: UsageWarningEmail({
      userName,
      usagePercentage,
      limitType,
      currentUsage,
      maxLimit,
      upgradeUrl: `${EMAIL_CONFIG.baseUrl}/pricing`,
    }),
    from: EMAIL_CONFIG.from.hello,
    emailType: EmailType.USAGE_WARNING,
  })
}

/**
 * Send daily digest email with flashcard reminders
 */
export async function sendDailyDigestEmail({
  userEmail,
  userName,
  dueFlashcards,
  currentStreak,
}: {
  userEmail: string
  userName?: string
  dueFlashcards: number
  currentStreak: number
}) {
  const subject = dueFlashcards > 0
    ? `You have ${dueFlashcards} flashcard${dueFlashcards !== 1 ? 's' : ''} ready for review`
    : `Keep your ${currentStreak}-day streak going!`

  return sendEmail({
    to: userEmail,
    subject,
    react: DailyDigestEmail({
      userName,
      dueFlashcards,
      currentStreak,
      dashboardUrl: `${EMAIL_CONFIG.baseUrl}/dashboard`,
    }),
    from: EMAIL_CONFIG.from.hello,
    emailType: EmailType.DAILY_DIGEST,
  })
}
