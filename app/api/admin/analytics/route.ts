import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

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

    // User Statistics
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    const { count: newUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const { count: premiumUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .in('subscription_tier', ['premium', 'enterprise'])

    const { count: activeUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')

    // Content Statistics
    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })

    const { count: newDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const { count: totalFlashcards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })

    const { count: newFlashcards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const { count: totalPodcasts } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true })

    const { count: newPodcasts } = await supabase
      .from('podcasts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const { count: totalMindmaps } = await supabase
      .from('mindmaps')
      .select('*', { count: 'exact', head: true })

    const { count: newMindmaps } = await supabase
      .from('mindmaps')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // Study Sessions
    const { count: totalSessions } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })

    const { count: newSessions } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    const { data: completedSessions } = await supabase
      .from('study_sessions')
      .select('duration_minutes')
      .eq('completed', true)
      .gte('created_at', startDate.toISOString())

    const totalStudyMinutes = completedSessions?.reduce(
      (sum, session) => sum + (session.duration_minutes || 0),
      0
    ) || 0

    // User Growth Trend (last 30 days by day)
    const { data: userGrowth } = await supabase
      .from('user_profiles')
      .select('created_at')
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })

    // Group by day
    const growthByDay: Record<string, number> = {}
    userGrowth?.forEach((user) => {
      const day = new Date(user.created_at).toISOString().split('T')[0]
      growthByDay[day] = (growthByDay[day] || 0) + 1
    })

    const growthTrend = Object.entries(growthByDay).map(([date, count]) => ({
      date,
      count,
    }))

    // Content Generation Breakdown
    const { data: documentsByType } = await supabase
      .from('documents')
      .select('document_type')
      .gte('created_at', startDate.toISOString())

    const typeBreakdown: Record<string, number> = {}
    documentsByType?.forEach((doc) => {
      const type = doc.document_type || 'unknown'
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1
    })

    // Learning Style Distribution
    const { data: learningStyles } = await supabase
      .from('user_profiles')
      .select('learning_style')
      .not('learning_style', 'is', null)

    const styleDistribution: Record<string, number> = {}
    learningStyles?.forEach((profile) => {
      const style = profile.learning_style
      if (style) {
        styleDistribution[style] = (styleDistribution[style] || 0) + 1
      }
    })

    // Subscription Tier Distribution
    const { data: subscriptionTiers } = await supabase
      .from('user_profiles')
      .select('subscription_tier')

    const tierDistribution: Record<string, number> = {}
    subscriptionTiers?.forEach((profile) => {
      const tier = profile.subscription_tier
      tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
    })

    // Most Active Users (top 10)
    const { data: activeUsersData } = await supabase
      .from('study_sessions')
      .select('user_id')
      .gte('created_at', startDate.toISOString())

    const sessionsByUser: Record<string, number> = {}
    activeUsersData?.forEach((session) => {
      sessionsByUser[session.user_id] = (sessionsByUser[session.user_id] || 0) + 1
    })

    const topUserIds = Object.entries(sessionsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId]) => userId)

    const { data: topUsers } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', topUserIds)

    const mostActiveUsers = topUsers?.map((user) => ({
      ...user,
      sessionCount: sessionsByUser[user.id] || 0,
    })) || []

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
