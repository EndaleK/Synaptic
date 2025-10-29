import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

/**
 * POST /api/sync-profile
 * Creates or updates user profile in Supabase from Clerk data
 */
export async function POST() {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get full user data from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "User not found in Clerk" }, { status: 404 })
    }

    const supabase = await createClient()

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        message: "Profile already exists",
        profile_id: existingProfile.id,
        clerk_user_id: existingProfile.clerk_user_id
      }, { status: 200 })
    }

    // Create new profile
    const email = user.emailAddresses?.[0]?.emailAddress || ''
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()

    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert({
        clerk_user_id: userId,
        email: email,
        full_name: fullName || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create profile:', error)
      return NextResponse.json({
        error: "Failed to create profile",
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: "Profile created successfully",
      profile: newProfile
    }, { status: 201 })

  } catch (error) {
    console.error('Sync profile error:', error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/sync-profile
 * Check if user profile exists
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email, created_at')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({
        exists: false,
        clerk_user_id: userId
      }, { status: 200 })
    }

    return NextResponse.json({
      exists: true,
      profile: profile
    }, { status: 200 })

  } catch (error) {
    console.error('Check profile error:', error)
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 })
  }
}
