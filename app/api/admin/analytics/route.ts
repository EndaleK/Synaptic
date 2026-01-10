import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Fetch comprehensive platform analytics
 *
 * Query params:
 * - range: Time range (7d, 30d, 90d, all) - default: 30d
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
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(0) // Beginning of time
    }

    // Run all independent queries in parallel for ~8x performance improvement
    const [
      // User Statistics
      totalUsersRes,
      newUsersRes,
      premiumUsersRes,
      activeUsersRes,
      // Content Statistics
      totalDocumentsRes,
      newDocumentsRes,
      totalFlashcardsRes,
      newFlashcardsRes,
      totalPodcastsRes,
      newPodcastsRes,
      totalMindmapsRes,
      newMindmapsRes,
      // Study Sessions
      totalSessionsRes,
      newSessionsRes,
      completedSessionsRes,
      // Trend & Distribution Data
      userGrowthRes,
      documentsByTypeRes,
      learningStylesRes,
      subscriptionTiersRes,
      activeUsersDataRes,
    ] = await Promise.all([
      // User Statistics
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).in('subscription_tier', ['premium', 'enterprise']),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      // Content Statistics
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      supabase.from('flashcards').select('*', { count: 'exact', head: true }),
      supabase.from('flashcards').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      supabase.from('podcasts').select('*', { count: 'exact', head: true }),
      supabase.from('podcasts').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      supabase.from('mindmaps').select('*', { count: 'exact', head: true }),
      supabase.from('mindmaps').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      // Study Sessions
      supabase.from('study_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('study_sessions').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
      supabase.from('study_sessions').select('duration_minutes').eq('completed', true).gte('created_at', startDate.toISOString()),
      // Trend & Distribution Data
      supabase.from('user_profiles').select('created_at').gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: true }),
      supabase.from('documents').select('document_type').gte('created_at', startDate.toISOString()),
      supabase.from('user_profiles').select('learning_style').not('learning_style', 'is', null),
      supabase.from('user_profiles').select('subscription_tier'),
      supabase.from('study_sessions').select('user_id').gte('created_at', startDate.toISOString()),
    ])

    // Extract counts from responses
    const totalUsers = totalUsersRes.count
    const newUsers = newUsersRes.count
    const premiumUsers = premiumUsersRes.count
    const activeUsers = activeUsersRes.count
    const totalDocuments = totalDocumentsRes.count
    const newDocuments = newDocumentsRes.count
    const totalFlashcards = totalFlashcardsRes.count
    const newFlashcards = newFlashcardsRes.count
    const totalPodcasts = totalPodcastsRes.count
    const newPodcasts = newPodcastsRes.count
    const totalMindmaps = totalMindmapsRes.count
    const newMindmaps = newMindmapsRes.count
    const totalSessions = totalSessionsRes.count
    const newSessions = newSessionsRes.count

    // Process completed sessions
    const completedSessions = completedSessionsRes.data
    const totalStudyMinutes = completedSessions?.reduce(
      (sum, session) => sum + (session.duration_minutes || 0),
      0
    ) || 0

    // Process user growth trend
    const userGrowth = userGrowthRes.data
    const growthByDay: Record<string, number> = {}
    userGrowth?.forEach((user) => {
      const day = new Date(user.created_at).toISOString().split('T')[0]
      growthByDay[day] = (growthByDay[day] || 0) + 1
    })
    const growthTrend = Object.entries(growthByDay).map(([date, count]) => ({
      date,
      count,
    }))

    // Process document type breakdown
    const documentsByType = documentsByTypeRes.data
    const typeBreakdown: Record<string, number> = {}
    documentsByType?.forEach((doc) => {
      const type = doc.document_type || 'unknown'
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1
    })

    // Process learning style distribution
    const learningStyles = learningStylesRes.data
    const styleDistribution: Record<string, number> = {}
    learningStyles?.forEach((profile) => {
      const style = profile.learning_style
      if (style) {
        styleDistribution[style] = (styleDistribution[style] || 0) + 1
      }
    })

    // Process subscription tier distribution
    const subscriptionTiers = subscriptionTiersRes.data
    const tierDistribution: Record<string, number> = {}
    subscriptionTiers?.forEach((profile) => {
      const tier = profile.subscription_tier
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
    })

    // Process most active users (top 10) - requires second query for user details
    const activeUsersData = activeUsersDataRes.data
    const sessionsByUser: Record<string, number> = {}
    activeUsersData?.forEach((session) => {
      sessionsByUser[session.user_id] = (sessionsByUser[session.user_id] || 0) + 1
    })

    const topUserIds = Object.entries(sessionsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId]) => userId)

    // Only fetch user details if there are active users
    let mostActiveUsers: Array<{ id: string; email: string; full_name: string; sessionCount: number }> = []
    if (topUserIds.length > 0) {
      const { data: topUsers } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', topUserIds)

      mostActiveUsers = topUsers?.map((user) => ({
        ...user,
        sessionCount: sessionsByUser[user.id] || 0,
      })) || []
    }

    const analytics = {
      users: {
        total: totalUsers || 0,
        new: newUsers || 0,
        premium: premiumUsers || 0,
        active: activeUsers || 0,
        growthTrend,
      },
      content: {
        documents: {
          total: totalDocuments || 0,
          new: newDocuments || 0,
          typeBreakdown,
        },
        flashcards: {
          total: totalFlashcards || 0,
          new: newFlashcards || 0,
        },
        podcasts: {
          total: totalPodcasts || 0,
          new: newPodcasts || 0,
        },
        mindmaps: {
          total: totalMindmaps || 0,
          new: newMindmaps || 0,
        },
      },
      engagement: {
        sessions: {
          total: totalSessions || 0,
          new: newSessions || 0,
        },
        studyMinutes: totalStudyMinutes,
        averageMinutesPerSession:
          newSessions && newSessions > 0
            ? Math.round(totalStudyMinutes / newSessions)
            : 0,
        mostActiveUsers,
      },
      demographics: {
        learningStyles: styleDistribution,
        subscriptionTiers: tierDistribution,
      },
    }

    return NextResponse.json({
      success: true,
      analytics,
      range,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics fetch failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        analytics: null,
      },
      { status: 500 }
    )
  }
}
