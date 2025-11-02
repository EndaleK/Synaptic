import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API endpoint to ensure user profile exists
 * Called automatically when user accesses Writer or Video modes
 * Uses service role key to bypass RLS policies
 */
export async function POST() {
  try {
    // Get Clerk auth
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - not logged in' },
        { status: 401 }
      )
    }

    // Get full user details from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'Could not fetch user details from Clerk' },
        { status: 500 }
      )
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        profile: existingProfile,
        message: 'Profile already exists'
      })
    }

    // Create new profile
    const email = clerkUser.emailAddresses[0]?.emailAddress || 'unknown@example.com'
    const fullName = clerkUser.fullName ||
                     `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
                     clerkUser.username ||
                     'User'

    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        clerk_user_id: userId,
        email: email,
        full_name: fullName,
        subscription_tier: 'free',
        subscription_status: 'inactive',
        documents_used_this_month: 0
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return NextResponse.json(
        {
          error: 'Failed to create user profile',
          details: createError.message,
          hint: createError.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Profile created successfully',
      user: {
        clerk_user_id: userId,
        email: email,
        full_name: fullName
      }
    })

  } catch (error) {
    console.error('Unexpected error in ensure-profile:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
