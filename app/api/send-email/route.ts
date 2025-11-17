/**
 * Email Sending API Route
 *
 * Allows sending emails using hello@synaptic.study or support@synaptic.study
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendEmail, EMAIL_CONFIG, isEmailConfigured } from '@/lib/email/client'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if email service is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { to, subject, html, react, from, replyTo, emailType } = body

    // Validate required fields
    if (!to || !subject || (!html && !react)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and html or react' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const toEmails = Array.isArray(to) ? to : [to]
    for (const email of toEmails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `Invalid email format: ${email}` },
          { status: 400 }
        )
      }
    }

    // Validate 'from' address if provided
    if (from) {
      const validFromAddresses = [
        EMAIL_CONFIG.from.hello,
        EMAIL_CONFIG.from.support,
        'hello@synaptic.study',
        'support@synaptic.study',
      ]

      // Extract email from "Name <email@domain.com>" format
      const fromEmail = from.includes('<')
        ? from.match(/<(.+?)>/)?.[1]
        : from

      const isValidFrom = validFromAddresses.some(valid =>
        valid.includes(fromEmail || '')
      )

      if (!isValidFrom) {
        return NextResponse.json(
          {
            error: 'Invalid from address. Must be hello@synaptic.study or support@synaptic.study',
            allowedAddresses: ['hello@synaptic.study', 'support@synaptic.study']
          },
          { status: 400 }
        )
      }
    }

    // Send email
    const result = await sendEmail({
      to,
      subject,
      html,
      react,
      from: from || EMAIL_CONFIG.from.hello,
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      emailType,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result.data,
    })

  } catch (error) {
    console.error('❌ Email API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
