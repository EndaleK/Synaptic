import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/analytics/track
 *
 * Tracks analytics events for user behavior and retention metrics.
 * Accepts both authenticated and anonymous events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventName, properties, pagePath, sessionId } = body

    if (!eventName) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      )
    }

    // Get user ID if authenticated (optional for analytics)
    const { userId: clerkUserId } = await auth()

    const supabase = await createClient()

    // Look up user profile ID if authenticated
    let userProfileId: string | null = null
    if (clerkUserId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single()

      userProfileId = profile?.id || null
    }

    // Insert analytics event
    const { error } = await supabase.from('analytics_events').insert({
      user_id: userProfileId,
      event_name: eventName,
      event_properties: properties || {},
      page_path: pagePath,
      session_id: sessionId
    })

    if (error) {
      // Log but don't fail - analytics shouldn't break the app
      console.error('[Analytics] Insert failed:', error)
      // Still return success to client - analytics is fire-and-forget
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // Silent fail for analytics - never break the app
    console.error('[Analytics] Track error:', error)
    return NextResponse.json({ success: true })
  }
}
