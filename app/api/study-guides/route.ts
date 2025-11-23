import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Fetch all study guides for user
    const { data: studyGuides, error } = await supabase
      .from('study_guides')
      .select(`
        *,
        documents (
          file_name,
          file_type
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    logger.info('Study guides fetched', {
      userId,
      count: studyGuides?.length || 0
    })

    return NextResponse.json({ studyGuides }, { status: 200 })

  } catch (error) {
    logger.error('Error fetching study guides:', error)
    return NextResponse.json(
      { error: "Failed to fetch study guides" },
      { status: 500 }
    )
  }
}
