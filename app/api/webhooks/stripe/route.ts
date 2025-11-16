import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import {
  sendSubscriptionConfirmedEmail,
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
} from '@/lib/email/send'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Get the raw body as text
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      logger.warn('Missing Stripe signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      logger.error('Webhook signature verification failed', err, {
        error: err?.message
      })
      return NextResponse.json(
        { error: `Webhook Error: ${err?.message}` },
        { status: 400 }
      )
    }

    logger.info('Received Stripe webhook', {
      type: event.type,
      eventId: event.id
    })

    const supabase = await createClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        logger.info('Checkout session completed', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        })

        // Get Clerk user ID from metadata
        const clerkUserId = session.metadata?.clerk_user_id
        const tier = session.metadata?.tier || 'premium'

        if (!clerkUserId) {
          logger.error('Missing clerk_user_id in session metadata', {
            sessionId: session.id
          })
          break
        }

        // Get user profile for email
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email, full_name')
          .eq('clerk_user_id', clerkUserId)
          .single()

        // Update user profile with subscription tier
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', clerkUserId)

        if (updateError) {
          logger.error('Failed to update user profile after checkout', updateError, {
            clerkUserId,
            tier
          })
        } else {
          logger.info('User upgraded to premium', {
            clerkUserId,
            tier,
            subscriptionId: session.subscription
          })

          // Send subscription confirmation email
          if (userProfile?.email) {
            await sendSubscriptionConfirmedEmail({
              userEmail: userProfile.email,
              userName: userProfile.full_name || undefined,
              planName: tier === 'premium' ? 'Synaptic Premium' : 'Synaptic Pro',
              billingInterval: session.metadata?.billing_interval as 'month' | 'year' || 'month',
            })
            logger.info('Subscription confirmation email sent', {
              email: userProfile.email
            })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        logger.info('Subscription updated', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer
        })

        // Get Clerk user ID from metadata or customer
        let clerkUserId = subscription.metadata?.clerk_user_id

        if (!clerkUserId) {
          // Fallback: Get user by stripe_customer_id
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('clerk_user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single()

          clerkUserId = profile?.clerk_user_id
        }

        if (!clerkUserId) {
          logger.error('Cannot find user for subscription update', {
            subscriptionId: subscription.id,
            customerId: subscription.customer
          })
          break
        }

        // Map Stripe status to our subscription status
        const subscriptionStatus = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active'
          : subscription.status === 'past_due'
          ? 'past_due'
          : 'canceled'

        // Update user profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: subscriptionStatus,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', clerkUserId)

        if (updateError) {
          logger.error('Failed to update subscription status', updateError, {
            clerkUserId,
            subscriptionId: subscription.id
          })
        } else {
          logger.info('Subscription status updated', {
            clerkUserId,
            status: subscriptionStatus
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        logger.info('Subscription canceled', {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        })

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('clerk_user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (!profile?.clerk_user_id) {
          logger.error('Cannot find user for subscription deletion', {
            subscriptionId: subscription.id,
            customerId: subscription.customer
          })
          break
        }

        // Downgrade user to free tier
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', profile.clerk_user_id)

        if (updateError) {
          logger.error('Failed to downgrade user after cancellation', updateError, {
            clerkUserId: profile.clerk_user_id
          })
        } else {
          logger.info('User downgraded to free tier', {
            clerkUserId: profile.clerk_user_id,
            subscriptionId: subscription.id
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        logger.warn('Payment failed for subscription', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          amountDue: invoice.amount_due / 100
        })

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('clerk_user_id, email, full_name, subscription_tier')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (!profile?.clerk_user_id) {
          logger.error('Cannot find user for payment failure', {
            customerId: invoice.customer
          })
          break
        }

        // Update to past_due status
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', profile.clerk_user_id)

        logger.info('User subscription marked as past_due', {
          clerkUserId: profile.clerk_user_id
        })

        // Send payment failed email
        if (profile.email) {
          const retryDate = invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
            : undefined

          await sendPaymentFailedEmail({
            userEmail: profile.email,
            userName: profile.full_name || undefined,
            amountDue: invoice.amount_due,
            currency: invoice.currency,
            planName: profile.subscription_tier === 'premium' ? 'Synaptic Premium' : 'Synaptic Pro',
            retryDate,
            failureReason: invoice.last_finalization_error?.message,
          })
          logger.info('Payment failed email sent', {
            email: profile.email
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        logger.info('Payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid / 100
        })

        // Skip sending receipt for the first invoice (covered by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') {
          break
        }

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('clerk_user_id, email, full_name, subscription_tier')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (!profile?.email) {
          logger.error('Cannot find user for payment receipt', {
            customerId: invoice.customer
          })
          break
        }

        // Send payment receipt email
        const billingPeriodStart = invoice.period_start
          ? new Date(invoice.period_start * 1000).toLocaleDateString()
          : ''
        const billingPeriodEnd = invoice.period_end
          ? new Date(invoice.period_end * 1000).toLocaleDateString()
          : ''

        await sendPaymentReceiptEmail({
          userEmail: profile.email,
          userName: profile.full_name || undefined,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          planName: profile.subscription_tier === 'premium' ? 'Synaptic Premium' : 'Synaptic Pro',
          billingPeriodStart,
          billingPeriodEnd,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
          cardLast4: (invoice.charge as any)?.payment_method_details?.card?.last4,
        })
        logger.info('Payment receipt email sent', {
          email: profile.email
        })
        break
      }

      default:
        logger.debug('Unhandled webhook event', {
          type: event.type,
          eventId: event.id
        })
    }

    const duration = Date.now() - startTime
    logger.api('POST', '/api/webhooks/stripe', 200, duration, {
      eventType: event.type,
      eventId: event.id
    })

    return NextResponse.json({ received: true })

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Webhook processing error', error, {
      errorMessage: error?.message
    })
    logger.api('POST', '/api/webhooks/stripe', 500, duration, {
      error: error?.message
    })

    return NextResponse.json(
      { error: 'Webhook processing failed', message: error?.message },
      { status: 500 }
    )
  }
}
