import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users
 * List all users with statistics and subscription info
 *
 * Query params:
 * - search: Filter by email or name
 * - tier: Filter by subscription tier (free, premium, enterprise)
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 *
 * Requires: viewer role or higher
 */
export async function GET(req: NextRequest) {
  // Check admin access
  const adminOrResponse = await requireAdmin('viewer')
  if (adminOrResponse instanceof NextResponse) {
    return adminOrResponse
  }

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)

    // Parse query parameters
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for user_profiles
    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    if (tier) {
      query = query.eq('subscription_tier', tier)
    }

    const { data: users, error: usersError, count } = await query

    if (usersError) {
      throw usersError
    }

    // Fetch aggregated statistics for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        // Count documents
        const { count: documentCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Count flashcard sets
        const { count: flashcardSetsCount } = await supabase
          .from('flashcards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Count study sessions
        const { count: sessionCount } = await supabase
          .from('study_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        // Get last activity (most recent study session or document upload)
        const { data: lastSession } = await supabase
          .from('study_sessions')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const { data: lastDocument } = await supabase
          .from('documents')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Determine most recent activity
        const lastActivity = [lastSession?.created_at, lastDocument?.created_at]
          .filter(Boolean)
          .sort()
          .reverse()[0] || user.created_at

        return {
          ...user,
          stats: {
            documentCount: documentCount || 0,
            flashcardSetsCount: flashcardSetsCount || 0,
            sessionCount: sessionCount || 0,
            lastActivity,
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        users: [],
      },
      { status: 500 }
    )
  }
}
