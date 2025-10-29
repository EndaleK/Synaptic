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
  '/pricing',
  '/about',
  '/clerk-debug',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    const { userId } = await auth()

    if (!userId) {
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

          await supabase
            .from('user_profiles')
            .insert({
              clerk_user_id: userId,
              email: email,
              created_at: new Date().toISOString()
            })
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
