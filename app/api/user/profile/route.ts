// API Route: /api/user/profile
// Handles user profile operations (GET, POST, PATCH)

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile
} from '@/lib/supabase/user-profile'
import type { LearningStyle, PreferredMode } from '@/lib/supabase/types'

/**
 * GET /api/user/profile
 * Fetch the current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { profile, error } = await getUserProfile(userId)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch profile: ${error}` },
        { status: 500 }
      )
    }

    // If profile doesn't exist, return null (not an error)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('GET /api/user/profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/profile
 * Create a new user profile (first-time setup)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { learning_style, preferred_mode } = body

    // Check if profile already exists
    const { profile: existingProfile } = await getUserProfile(userId)

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PATCH to update.' },
        { status: 400 }
      )
    }

    // Create new profile
    const { profile, error } = await createUserProfile({
      clerk_user_id: userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      learning_style: learning_style as LearningStyle,
      preferred_mode: preferred_mode as PreferredMode
    })

    if (error) {
      return NextResponse.json(
        { error: `Failed to create profile: ${error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('POST /api/user/profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Update existing user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const updates = {
      learning_style: body.learning_style as LearningStyle | undefined,
      preferred_mode: body.preferred_mode as PreferredMode | undefined,
      full_name: body.full_name as string | undefined
    }

    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates]
      }
    })

    const { profile, error } = await updateUserProfile(userId, updates)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update profile: ${error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('PATCH /api/user/profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
