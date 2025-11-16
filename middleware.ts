import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out(.*)',
  '/api/webhooks(.*)',
  '/api/inngest(.*)', // Inngest background job endpoint
  '/api/storage/test', // Storage diagnostic endpoint
  '/api/documents/(.*)/storage-info', // Document storage diagnostic
  '/pricing',
  '/about',
  '/clerk-debug',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    const { userId } = await auth()

    if (!userId) {
      // For API routes, return JSON error instead of redirect
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in to access this resource' },
          { status: 401 }
        )
      }

      // For page routes, redirect to sign-in
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Auto-create user profile if it doesn't exist
    // Only do this for dashboard routes to avoid performance impact on API routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()

        // Check if profile exists
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        // Create profile if it doesn't exist
        if (!profile) {
          const sessionClaims = await auth()
          const email = sessionClaims.sessionClaims?.email as string || ''
          const fullName = (sessionClaims.sessionClaims?.firstName || '') + ' ' + (sessionClaims.sessionClaims?.lastName || '')

          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              clerk_user_id: userId,
              email: email,
              full_name: fullName.trim() || undefined,
              created_at: new Date().toISOString()
            })

          // Send welcome email if profile was successfully created
          if (!insertError && email) {
            // Send welcome email asynchronously (don't block the request)
            const { sendWelcomeEmail } = await import('@/lib/email/send')
            sendWelcomeEmail({
              userEmail: email,
              userName: fullName.trim() || undefined,
            }).catch(err => {
              console.error('Failed to send welcome email:', err)
            })
          }
        }
      } catch (error) {
        // Log error for debugging
        console.error('Failed to auto-create user profile:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
      }
    }
  }

  // Update Supabase session
  return await updateSession(req)
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
