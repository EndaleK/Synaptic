/**
 * Email Sending Examples
 *
 * Demonstrates how to send emails from hello@synaptic.study and support@synaptic.study
 */

import { EMAIL_CONFIG } from './client'

/**
 * Example 1: Send a simple email from hello@synaptic.study
 */
export async function sendWelcomeNotification(userEmail: string, userName?: string) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: userEmail,
      subject: 'Welcome to Synaptic™!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7B3FF2;">Welcome to Synaptic™!</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>We're excited to have you on board. Get started by uploading your first document!</p>
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard"
             style="display: inline-block; background: #7B3FF2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Go to Dashboard
          </a>
          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
            Best regards,<br>
            The Synaptic™ Team
          </p>
        </div>
      `,
      from: EMAIL_CONFIG.from.hello,
    }),
  })

  return response.json()
}

/**
 * Example 2: Send a support email from support@synaptic.study
 */
export async function sendSupportResponse(
  userEmail: string,
  userName: string | undefined,
  ticketId: string,
  responseMessage: string
) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: userEmail,
      subject: `Re: Support Ticket #${ticketId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7B3FF2;">Support Ticket #${ticketId}</h2>
          <p>Hi ${userName || 'there'},</p>
          <p>Thank you for reaching out to Synaptic™ Support. Here's our response:</p>
          <div style="background: #f8fafc; border-left: 4px solid #7B3FF2; padding: 16px; margin: 24px 0;">
            ${responseMessage}
          </div>
          <p>If you have any additional questions, feel free to reply to this email.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
            Best regards,<br>
            Synaptic™ Support Team
          </p>
        </div>
      `,
      from: EMAIL_CONFIG.from.support,
      replyTo: EMAIL_CONFIG.replyTo,
    }),
  })

  return response.json()
}

/**
 * Example 3: Send email with custom from address
 */
export async function sendCustomEmail({
  to,
  subject,
  html,
  fromAddress = 'hello', // 'hello' or 'support'
}: {
  to: string | string[]
  subject: string
  html: string
  fromAddress?: 'hello' | 'support'
}) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      html,
      from: fromAddress === 'support'
        ? EMAIL_CONFIG.from.support
        : EMAIL_CONFIG.from.hello,
    }),
  })

  return response.json()
}

/**
 * Example 4: Send bulk emails (multiple recipients)
 */
export async function sendBulkNotification(
  recipients: string[],
  subject: string,
  html: string
) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: recipients,
      subject,
      html,
      from: EMAIL_CONFIG.from.hello,
    }),
  })

  return response.json()
}

/**
 * Example 5: Send study reminder email
 */
export async function sendStudyReminder(
  userEmail: string,
  userName: string | undefined,
  dueFlashcardsCount: number
) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: userEmail,
      subject: `📚 You have ${dueFlashcardsCount} flashcards due for review`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7B3FF2;">Time to Review! 📚</h1>
          <p>Hi ${userName || 'there'},</p>
          <p>You have <strong>${dueFlashcardsCount} flashcards</strong> waiting for review.</p>
          <p>Consistent review helps strengthen your memory and improve retention.</p>
          <a href="${EMAIL_CONFIG.baseUrl}/dashboard?mode=flashcards"
             style="display: inline-block; background: #7B3FF2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Start Reviewing
          </a>
          <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
            Keep up the great work!<br>
            The Synaptic™ Team
          </p>
        </div>
      `,
      from: EMAIL_CONFIG.from.hello,
    }),
  })

  return response.json()
}

/**
 * Example 6: Test email configuration
 */
export async function sendTestEmail(testRecipient: string) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: testRecipient,
      subject: 'Synaptic™ Email Test',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7B3FF2;">Email Configuration Test</h1>
          <p>This is a test email from Synaptic™.</p>
          <p>If you're receiving this, your email configuration is working correctly! ✅</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">
              <strong>From:</strong> hello@synaptic.study<br>
              <strong>Reply-To:</strong> support@synaptic.study<br>
              <strong>Sent:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            The Synaptic™ Team
          </p>
        </div>
      `,
      from: EMAIL_CONFIG.from.hello,
    }),
  })

  return response.json()
}
