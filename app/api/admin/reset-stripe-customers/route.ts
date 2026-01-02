import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Clear all Stripe customer IDs
    const { error } = await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: null })
      .not('stripe_customer_id', 'is', null)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Cleared all Stripe customer IDs'
    })
  } catch (error) {
    console.error('Error clearing Stripe customer IDs:', error)
    return NextResponse.json(
      { error: 'Failed to clear customer IDs' },
      { status: 500 }
    )
  }
}
