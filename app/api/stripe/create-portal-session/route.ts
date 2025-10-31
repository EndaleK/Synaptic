import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthenticated portal session request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const supabase = await createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('clerk_user_id', userId)
      .single()

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile', profileError, { userId })
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!profile.stripe_customer_id) {
      logger.warn('User has no Stripe customer ID', { userId })
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    req.headers.get('origin') ||
                    'http://localhost:3000'

    logger.info('Creating Stripe Customer Portal session', {
      userId,
      customerId: profile.stripe_customer_id,
      tier: profile.subscription_tier
    })

    // Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    })

    const duration = Date.now() - startTime
    logger.api('POST', '/api/stripe/create-portal-session', 200, duration, {
      userId,
      customerId: profile.stripe_customer_id
    })

    return NextResponse.json({
      url: portalSession.url
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Stripe portal session creation failed', error, {
      userId: 'unknown',
      errorMessage: error?.message
    })
    logger.api('POST', '/api/stripe/create-portal-session', 500, duration, {
      error: error?.message
    })

    return NextResponse.json(
      {
        error: 'Failed to create portal session',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
