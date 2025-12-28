/**
 * Daily Digest Cron Job
 *
 * Runs daily at 8 AM UTC via Vercel Cron
 * Sends email reminders to users with due flashcards or active streaks
 *
 * Security: Protected by CRON_SECRET header (Vercel sets this automatically)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailyDigestEmail } from '@/lib/email/send'
import { isEmailConfigured } from '@/lib/email/client'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for processing all users

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[DailyDigest] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isEmailConfigured()) {
    console.log('[DailyDigest] Email service not configured, skipping')
    return NextResponse.json({
      success: false,
      message: 'Email service not configured'
    })
  }

  const startTime = Date.now()
  let emailsSent = 0
  let errors = 0

  try {
    const supabase = await createClient()

    // Fetch all users with email digest enabled
    // Note: You may need to add email_digest_enabled column to user_profiles
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        current_streak,
        email_digest_enabled
      `)
      .or('email_digest_enabled.is.null,email_digest_enabled.eq.true')
      .not('email', 'is', null)

    if (usersError) {
      console.error('[DailyDigest] Error fetching users:', usersError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users'
      }, { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log('[DailyDigest] No users to process')
      return NextResponse.json({
        success: true,
        message: 'No users to process',
        emailsSent: 0
      })
    }

    console.log(`[DailyDigest] Processing ${users.length} users`)

    // Process users in batches to avoid overwhelming the email service
    const BATCH_SIZE = 10
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE)

      await Promise.all(batch.map(async (user) => {
        try {
          if (!user.email) {
            console.log(`[DailyDigest] Skipping user ${user.id} - no email`)
            return
          }

          // Count due flashcards for this user
          const { count: dueCount } = await supabase
            .from('review_queue')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lte('due_date', today.toISOString().split('T')[0])

          // Also count new flashcards (never reviewed)
          const { count: newCount } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .is('last_reviewed_at', null)

          const totalDue = (dueCount || 0) + (newCount || 0)
          const currentStreak = user.current_streak || 0

          // Only send email if there are due cards OR user has an active streak
          if (totalDue === 0 && currentStreak === 0) {
            console.log(`[DailyDigest] Skipping ${user.email} - no due cards and no streak`)
            return
          }

          // Send the email
          const result = await sendDailyDigestEmail({
            userEmail: user.email,
            userName: user.full_name || undefined,
            dueFlashcards: totalDue,
            currentStreak,
          })

          if (result.success) {
            emailsSent++
            console.log(`[DailyDigest] Email sent to ${user.email} (${totalDue} due, ${currentStreak} streak)`)
          } else {
            errors++
            console.error(`[DailyDigest] Failed to send to ${user.email}:`, result.error)
          }
        } catch (userError) {
          errors++
          console.error(`[DailyDigest] Error processing user ${user.id}:`, userError)
        }
      }))

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const duration = Date.now() - startTime

    console.log(`[DailyDigest] Complete: ${emailsSent} sent, ${errors} errors, ${duration}ms`)

    return NextResponse.json({
      success: true,
      emailsSent,
      errors,
      duration: `${duration}ms`,
      totalUsers: users.length
    })

  } catch (error) {
    console.error('[DailyDigest] Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
