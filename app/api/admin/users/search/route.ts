import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users/search?email=xxx
 *
 * Search for a user by email in both Clerk and Supabase
 * Returns data from both sources
 */
export async function GET(request: NextRequest) {
  // Check admin access
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) {
    return admin
  }

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      )
    }

    // Search Clerk
    let clerkUser = null
    try {
      const client = await clerkClient()
      const users = await client.users.getUserList({
        emailAddress: [email]
      })
      clerkUser = users.data[0] || null
    } catch (error) {
      console.error('Error fetching from Clerk:', error)
    }

    // Search Supabase
    let supabaseProfile = null
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      supabaseProfile = data
    } catch (error) {
      // User might not exist in Supabase yet
    }

    // Build response
    return NextResponse.json({
      email,
      found: {
        clerk: !!clerkUser,
        supabase: !!supabaseProfile
      },
      clerk: clerkUser ? {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Unknown',
        imageUrl: clerkUser.imageUrl,
        emailAddresses: clerkUser.emailAddresses.map(e => ({
          email: e.emailAddress,
          verified: e.verification?.status === 'verified'
        })),
        createdAt: clerkUser.createdAt,
        updatedAt: clerkUser.updatedAt,
        lastSignInAt: clerkUser.lastSignInAt,
        lastActiveAt: clerkUser.lastActiveAt,
        banned: clerkUser.banned,
        publicMetadata: clerkUser.publicMetadata,
        privateMetadata: clerkUser.privateMetadata,
      } : null,
      supabase: supabaseProfile ? {
        id: supabaseProfile.id,
        clerkUserId: supabaseProfile.clerk_user_id,
        email: supabaseProfile.email,
        fullName: supabaseProfile.full_name,
        subscriptionTier: supabaseProfile.subscription_tier,
        subscriptionStatus: supabaseProfile.subscription_status,
        createdAt: supabaseProfile.created_at,
        lastActiveAt: supabaseProfile.last_active_at,
      } : null,
      status: !clerkUser && !supabaseProfile ? 'not_found' :
              clerkUser && !supabaseProfile ? 'clerk_only' :
              !clerkUser && supabaseProfile ? 'supabase_only' :
              'both',
      notes: !clerkUser && !supabaseProfile ?
        'User does not exist in Clerk or Supabase' :
        clerkUser && !supabaseProfile ?
        'User exists in Clerk but has not visited the dashboard yet (no Supabase profile)' :
        !clerkUser && supabaseProfile ?
        'User exists in Supabase but was deleted from Clerk (orphaned profile)' :
        'User exists in both systems'
    })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      {
        error: 'Failed to search for user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
