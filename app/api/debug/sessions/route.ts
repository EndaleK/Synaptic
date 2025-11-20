import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/debug/sessions
 * Debug endpoint to check study sessions
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get ALL sessions (both completed and not completed)
    const { data: allSessions, error: allError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('start_time', { ascending: false })
      .limit(20)

    // Get only completed sessions
    const { data: completedSessions, error: completedError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('completed', true)
      .order('start_time', { ascending: false })
      .limit(20)

    return NextResponse.json({
      userId,
      profileId: profile.id,
      totalSessions: allSessions?.length || 0,
      completedSessions: completedSessions?.length || 0,
      allSessions: allSessions || [],
      completedOnly: completedSessions || [],
      errors: {
        all: allError,
        completed: completedError
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}
