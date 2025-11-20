import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/whoami
 * Shows which user is currently logged in and their session count
 */
export async function GET(req: NextRequest) {
  try {
    // Get Clerk user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        message: "Not logged in"
      })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email, created_at')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        authenticated: true,
        clerkUserId: userId,
        hasProfile: false,
        error: "Profile not found - may need to be created"
      })
    }

    // Get session counts
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('id, completed, duration_minutes, start_time')
      .eq('user_id', profile.id)
      .order('start_time', { ascending: false })
      .limit(10)

    const completed = sessions?.filter(s => s.completed).length || 0
    const incomplete = sessions?.filter(s => !s.completed).length || 0
    const totalMinutes = sessions?.filter(s => s.completed).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0

    return NextResponse.json({
      authenticated: true,
      clerkUserId: userId,
      profileId: profile.id,
      email: profile.email || 'N/A',
      accountCreated: profile.created_at,
      sessionStats: {
        total: sessions?.length || 0,
        completed,
        incomplete,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60)
      },
      recentSessions: sessions?.map(s => ({
        id: s.id,
        startTime: s.start_time,
        completed: s.completed,
        duration: s.duration_minutes
      })) || []
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Failed to get user info"
    }, { status: 500 })
  }
}
