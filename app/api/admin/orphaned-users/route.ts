import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@supabase/supabase-js'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Admin endpoint to identify orphaned users
 * (users in Supabase but deleted from Clerk)
 * Requires viewer or higher role
 */
export async function GET() {
  try {
    // Require admin access
    const admin = await requireAdmin('viewer')
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Requires admin access' },
        { status: 403 }
      )
    }

    // Create Supabase client with service role
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

    // Get all users from Supabase
    const { data: supabaseUsers, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email, full_name, created_at')

    if (queryError) {
      console.error('Error querying users:', queryError)
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message },
        { status: 500 }
      )
    }

    if (!supabaseUsers || supabaseUsers.length === 0) {
      return NextResponse.json({
        success: true,
        orphanedUsers: [],
        total: 0,
        message: 'No users found in database'
      })
    }

    console.log(`Checking ${supabaseUsers.length} users for orphaned records...`)

    const client = await clerkClient()
    const orphanedUsers: Array<{
      id: string
      clerk_user_id: string
      email: string
      full_name: string | null
      created_at: string
      reason: string
    }> = []

    // Check each user in Clerk
    for (const user of supabaseUsers) {
      try {
        await client.users.getUser(user.clerk_user_id)
        // User exists in Clerk, not orphaned
      } catch (error: unknown) {
        // User not found in Clerk - this is an orphaned record
        if (error.status === 404 || error.message?.includes('not found')) {
          orphanedUsers.push({
            ...user,
            reason: 'Deleted from Clerk'
          })
        } else {
          console.error(`Error checking user ${user.clerk_user_id}:`, error)
          orphanedUsers.push({
            ...user,
            reason: `Clerk API error: ${error.message}`
          })
        }
      }
    }

    console.log(`Found ${orphanedUsers.length} orphaned users`)

    return NextResponse.json({
      success: true,
      orphanedUsers,
      total: orphanedUsers.length,
      totalUsers: supabaseUsers.length,
      message: orphanedUsers.length === 0
        ? 'No orphaned users found'
        : `Found ${orphanedUsers.length} orphaned user(s) (in Supabase but not in Clerk)`,
      note: 'These users may have been deleted from Clerk but still exist in your database'
    })

  } catch (error) {
    console.error('Error checking orphaned users:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE endpoint to clean up orphaned users
 * Requires superadmin role for safety
 */
export async function DELETE() {
  try {
    // Require superadmin for deletion operations
    const admin = await requireAdmin('superadmin')
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Requires superadmin role' },
        { status: 403 }
      )
    }

    // Create Supabase client with service role
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

    // First, get the list of orphaned users
    const { data: supabaseUsers, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email')

    if (queryError) {
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message },
        { status: 500 }
      )
    }

    if (!supabaseUsers || supabaseUsers.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No users found in database'
      })
    }

    const client = await clerkClient()
    const orphanedIds: string[] = []

    // Identify orphaned users
    for (const user of supabaseUsers) {
      try {
        await client.users.getUser(user.clerk_user_id)
        // User exists, not orphaned
      } catch (error: unknown) {
        if (error.status === 404 || error.message?.includes('not found')) {
          orphanedIds.push(user.id)
        }
      }
    }

    if (orphanedIds.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No orphaned users to delete'
      })
    }

    // Delete orphaned users from Supabase
    // Note: CASCADE deletes will handle related records (documents, flashcards, etc.)
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .in('id', orphanedIds)

    if (deleteError) {
      console.error('Error deleting orphaned users:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete orphaned users', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`Deleted ${orphanedIds.length} orphaned users`)

    return NextResponse.json({
      success: true,
      deleted: orphanedIds.length,
      message: `Successfully deleted ${orphanedIds.length} orphaned user(s)`,
      performedBy: {
        userId: admin.userId,
        email: admin.email,
        role: admin.role
      }
    })

  } catch (error) {
    console.error('Error deleting orphaned users:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
