import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { validateUUIDParam } from '@/lib/validation/uuid'

/**
 * GET /api/admin/users/[id]
 * Get detailed information about a specific user
 *
 * Requires: viewer role or higher
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin access
  const adminOrResponse = await requireAdmin('viewer')
  if (adminOrResponse instanceof NextResponse) {
    return adminOrResponse
  }

  try {
    const { id } = await params

    // Validate UUID format
    try {
      validateUUIDParam(id, 'User ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get detailed statistics
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const { count: totalSessions } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)

    const { count: totalDocuments } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)

    const { count: totalFlashcards } = await supabase
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        recentDocuments: documents || [],
        recentSessions: sessions || [],
        stats: {
          totalSessions: totalSessions || 0,
          totalDocuments: totalDocuments || 0,
          totalFlashcards: totalFlashcards || 0,
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch user details:', error)

    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user subscription tier or profile
 *
 * Body:
 * - subscription_tier?: 'free' | 'premium' | 'enterprise'
 * - subscription_status?: 'active' | 'inactive' | 'cancelled' | 'past_due'
 * - documents_used_this_month?: number
 *
 * Requires: editor role or higher
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin access (requires editor)
  const adminOrResponse = await requireAdmin('editor')
  if (adminOrResponse instanceof NextResponse) {
    return adminOrResponse
  }

  try {
    const { id } = await params

    // Validate UUID format
    try {
      validateUUIDParam(id, 'User ID')
    } catch {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const supabase = await createClient()

    // Validate allowed fields
    const allowedFields = [
      'subscription_tier',
      'subscription_status',
      'documents_used_this_month',
    ]

    const updates: Record<string, string | number | boolean | null> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updatedUser) {
      throw updateError || new Error('User not found')
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully',
    })
  } catch (error) {
    console.error('Failed to update user:', error)

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
