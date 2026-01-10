import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      })
    }

    // Get all user IDs for batch queries
    const userIds = users.map((u) => u.id)

    // Batch fetch all statistics in parallel (5 queries total instead of 5 * N)
    const [
      documentsRes,
      flashcardsRes,
      sessionsRes,
      lastSessionsRes,
      lastDocumentsRes,
    ] = await Promise.all([
      // Count documents per user
      supabase
        .from('documents')
        .select('user_id')
        .in('user_id', userIds),
      // Count flashcard sets per user
      supabase
        .from('flashcards')
        .select('user_id')
        .in('user_id', userIds),
      // Count study sessions per user
      supabase
        .from('study_sessions')
        .select('user_id')
        .in('user_id', userIds),
      // Get last session per user (using distinct on user_id with order)
      supabase
        .from('study_sessions')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // Get last document per user
      supabase
        .from('documents')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
    ])

    // Aggregate counts by user_id
    const documentCounts: Record<number, number> = {}
    documentsRes.data?.forEach((d) => {
      documentCounts[d.user_id] = (documentCounts[d.user_id] || 0) + 1
    })

    const flashcardCounts: Record<number, number> = {}
    flashcardsRes.data?.forEach((f) => {
      flashcardCounts[f.user_id] = (flashcardCounts[f.user_id] || 0) + 1
    })

    const sessionCounts: Record<number, number> = {}
    sessionsRes.data?.forEach((s) => {
      sessionCounts[s.user_id] = (sessionCounts[s.user_id] || 0) + 1
    })

    // Get most recent timestamps per user (first occurrence in descending order)
    const lastSessionDates: Record<number, string> = {}
    lastSessionsRes.data?.forEach((s) => {
      if (!lastSessionDates[s.user_id]) {
        lastSessionDates[s.user_id] = s.created_at
      }
    })

    const lastDocumentDates: Record<number, string> = {}
    lastDocumentsRes.data?.forEach((d) => {
      if (!lastDocumentDates[d.user_id]) {
        lastDocumentDates[d.user_id] = d.created_at
      }
    })

    // Build user stats
    const usersWithStats = users.map((user) => {
      const lastSessionDate = lastSessionDates[user.id]
      const lastDocumentDate = lastDocumentDates[user.id]

      // Determine most recent activity
      const lastActivity = [lastSessionDate, lastDocumentDate]
        .filter(Boolean)
        .sort()
        .reverse()[0] || user.created_at

      return {
        ...user,
        stats: {
          documentCount: documentCounts[user.id] || 0,
          flashcardSetsCount: flashcardCounts[user.id] || 0,
          sessionCount: sessionCounts[user.id] || 0,
          lastActivity,
        },
      }
    })

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
