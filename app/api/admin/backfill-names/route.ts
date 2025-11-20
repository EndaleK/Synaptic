import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@supabase/supabase-js'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Admin endpoint to backfill missing user names
 * Fetches users with NULL full_name and updates them from Clerk data
 * Requires editor or superadmin role
 */
export async function POST() {
  try {
    // Require admin access (editor or superadmin can backfill)
    const admin = await requireAdmin('editor')
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Requires editor or superadmin role' },
        { status: 403 }
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

    // Find all users with NULL or empty full_name
    const { data: usersToUpdate, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, clerk_user_id, email, full_name')
      .or('full_name.is.null,full_name.eq.')

    if (queryError) {
      console.error('Error querying users:', queryError)
      return NextResponse.json(
        { error: 'Database query failed', details: queryError.message },
        { status: 500 }
      )
    }

    if (!usersToUpdate || usersToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users need backfilling',
        updated: 0,
        failed: 0,
        skipped: 0
      })
    }

    console.log(`Found ${usersToUpdate.length} users to backfill`)

    // Process each user
    const results = {
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ clerk_user_id: string; email: string; status: string; fullName?: string; error?: string }>
    }

    for (const user of usersToUpdate) {
      try {
        // Fetch user details from Clerk
        const client = await clerkClient()
        let clerkUser

        try {
          clerkUser = await client.users.getUser(user.clerk_user_id)
        } catch (clerkError: any) {
          // Handle specific Clerk API errors
          if (clerkError.status === 404 || clerkError.message?.includes('not found')) {
            console.warn(`Clerk user not found (deleted): ${user.clerk_user_id}`)
            results.skipped++
            results.details.push({
              clerk_user_id: user.clerk_user_id,
              email: user.email,
              status: 'skipped',
              error: 'User deleted from Clerk'
            })
            continue
          }
          throw clerkError // Re-throw other errors
        }

        if (!clerkUser) {
          console.warn(`Clerk user not found: ${user.clerk_user_id}`)
          results.skipped++
          results.details.push({
            clerk_user_id: user.clerk_user_id,
            email: user.email,
            status: 'skipped',
            error: 'User not found in Clerk'
          })
          continue
        }

        // Extract name using same fallback chain as middleware
        const fullName = clerkUser.fullName ||
                        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
                        clerkUser.username ||
                        user.email.split('@')[0] || // Use email prefix as last resort
                        'User'

        // Update Supabase
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: fullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error(`Failed to update user ${user.clerk_user_id}:`, updateError)
          results.failed++
          results.details.push({
            clerk_user_id: user.clerk_user_id,
            email: user.email,
            status: 'failed',
            error: updateError.message
          })
        } else {
          results.updated++
          results.details.push({
            clerk_user_id: user.clerk_user_id,
            email: user.email,
            status: 'updated',
            fullName: fullName
          })
        }

      } catch (error) {
        console.error(`Error processing user ${user.clerk_user_id}:`, error)
        results.failed++
        results.details.push({
          clerk_user_id: user.clerk_user_id,
          email: user.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('Backfill complete:', results)

    return NextResponse.json({
      success: true,
      message: `Backfill complete: ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
      total: usersToUpdate.length,
      performedBy: {
        userId: admin.userId,
        email: admin.email,
        role: admin.role
      }
    })

  } catch (error) {
    console.error('Unexpected error in backfill-names:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to preview how many users would be affected
export async function GET() {
  try {
    // Require admin access (viewer can check count)
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

    // Count users with NULL or empty full_name
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .or('full_name.is.null,full_name.eq.')

    if (countError) {
      return NextResponse.json(
        { error: 'Database query failed', details: countError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      usersNeedingBackfill: count || 0,
      message: count === 0
        ? 'No users need backfilling'
        : `${count} user(s) will be updated when backfill is run`,
      note: 'Use POST request to perform the backfill (requires editor or superadmin role)'
    })

  } catch (error) {
    console.error('Error checking backfill count:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
