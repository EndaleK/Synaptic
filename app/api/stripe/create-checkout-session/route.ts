import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
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
      logger.warn('Unauthenticated checkout attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get request body
    const body = await req.json()
    const { priceId, tier } = body

    if (!priceId || !tier) {
      return NextResponse.json(
        { error: 'Missing priceId or tier' },
        { status: 400 }
      )
    }

    // Validate tier
    if (!['premium', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be premium or enterprise' },
        { status: 400 }
      )
    }

    logger.info('Creating Stripe checkout session', {
      userId,
      tier,
      priceId,
      email: user.emailAddresses[0]?.emailAddress
    })

    // Get or create Stripe customer
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('clerk_user_id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    // Create new Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: {
          clerk_user_id: userId
        }
      })

      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('clerk_user_id', userId)

      logger.info('Created new Stripe customer', {
        userId,
        customerId
      })
    }

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    req.headers.get('origin') ||
                    'http://localhost:3000'

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        clerk_user_id: userId,
        tier: tier
      },
      subscription_data: {
        metadata: {
          clerk_user_id: userId,
          tier: tier
        }
      },
      // Enable Customer Portal access
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      // Allow promo codes
      allow_promotion_codes: true,
      // Tax calculation
      automatic_tax: {
        enabled: true
      }
    })

    const duration = Date.now() - startTime
    logger.api('POST', '/api/stripe/create-checkout-session', 200, duration, {
      userId,
      sessionId: session.id,
      customerId,
      tier
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    logger.error('Stripe checkout session creation failed', error, {
      userId: 'unknown',
      errorMessage: error?.message
    })
    logger.api('POST', '/api/stripe/create-checkout-session', 500, duration, {
      error: error?.message
    })

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
