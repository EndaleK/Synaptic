import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Validate Stripe configuration
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      logger.error('Stripe not configured - missing STRIPE_SECRET_KEY')
      return NextResponse.json(
        {
          error: 'Subscription management not available',
          details: 'Stripe is not configured on the server. Please contact support.',
          code: 'STRIPE_NOT_CONFIGURED'
        },
        { status: 503 }
      )
    }

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

  } catch (error: unknown) {
    const duration = Date.now() - startTime

    // Determine error type and provide helpful message
    let errorDetails = error?.message || 'Unknown error'
    let errorCode = 'PORTAL_CREATION_FAILED'

    if (error?.type === 'StripeInvalidRequestError') {
      errorCode = 'STRIPE_INVALID_REQUEST'
      if (error?.message?.includes('customer')) {
        errorDetails = 'Invalid customer ID. Your subscription may not be properly configured.'
      } else if (error?.message?.includes('api_key')) {
        errorDetails = 'Stripe API key is invalid. Please contact support.'
        errorCode = 'STRIPE_AUTH_ERROR'
      }
    } else if (error?.type === 'StripeAPIError') {
      errorCode = 'STRIPE_API_ERROR'
      errorDetails = 'Stripe service is temporarily unavailable. Please try again in a few moments.'
    } else if (error?.type === 'StripeConnectionError') {
      errorCode = 'STRIPE_CONNECTION_ERROR'
      errorDetails = 'Unable to connect to Stripe. Please check your internet connection.'
    }

    logger.error('Stripe portal session creation failed', error, {
      userId: 'unknown',
      errorType: error?.type,
      errorCode,
      errorMessage: error?.message,
      stripeCode: error?.code
    })
    logger.api('POST', '/api/stripe/create-portal-session', 500, duration, {
      error: error?.message,
      errorType: error?.type
    })

    return NextResponse.json(
      {
        error: 'Failed to create portal session',
        details: errorDetails,
        code: errorCode,
        stripeError: error?.type || undefined
      },
      { status: 500 }
    )
  }
}
