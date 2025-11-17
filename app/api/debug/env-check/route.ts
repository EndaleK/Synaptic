import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * Debug endpoint to check environment variables on deployment
 *
 * SECURITY: This route checks authentication to prevent public access
 * DELETE THIS FILE after debugging is complete
 */
export async function GET() {
  try {
    // Require authentication to prevent public access to env info
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - sign in to view env diagnostics' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      // Check if critical API keys exist (don't expose actual values)
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
      apiKeys: {
        openai: {
          exists: !!process.env.OPENAI_API_KEY,
          length: process.env.OPENAI_API_KEY?.length || 0,
          prefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'missing'
        },
        youtube: {
          exists: !!process.env.YOUTUBE_API_KEY,
          length: process.env.YOUTUBE_API_KEY?.length || 0,
          prefix: process.env.YOUTUBE_API_KEY?.substring(0, 5) || 'missing'
        },
        deepseek: {
          exists: !!process.env.DEEPSEEK_API_KEY,
          configured: process.env.DEEPSEEK_API_KEY ? 'yes' : 'no'
        },
        anthropic: {
          exists: !!process.env.ANTHROPIC_API_KEY,
          configured: process.env.ANTHROPIC_API_KEY ? 'yes' : 'no'
        },
        lemonfox: {
          exists: !!process.env.LEMONFOX_API_KEY,
          configured: process.env.LEMONFOX_API_KEY ? 'yes' : 'no'
        }
      },
      database: {
        supabaseUrl: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing'
        },
        supabaseAnonKey: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
        },
        supabaseServiceKey: {
          exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
        }
      },
      auth: {
        clerkPublicKey: {
          exists: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          prefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8) || 'missing',
          isLive: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') || false,
          isTest: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') || false
        },
        clerkSecretKey: {
          exists: !!process.env.CLERK_SECRET_KEY,
          prefix: process.env.CLERK_SECRET_KEY?.substring(0, 8) || 'missing',
          isLive: process.env.CLERK_SECRET_KEY?.startsWith('sk_live_') || false,
          isTest: process.env.CLERK_SECRET_KEY?.startsWith('sk_test_') || false
        }
      },
      app: {
        appUrl: {
          exists: !!process.env.NEXT_PUBLIC_APP_URL,
          value: process.env.NEXT_PUBLIC_APP_URL || 'missing (will default to localhost:3000)'
        },
        vercelUrl: {
          exists: !!process.env.VERCEL_URL,
          value: process.env.VERCEL_URL || 'not on vercel'
        }
      },
      warnings: generateWarnings()
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check environment',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateWarnings(): string[] {
  const warnings: string[] = []

  // Check critical missing variables
  if (!process.env.OPENAI_API_KEY) {
    warnings.push('⚠️ OPENAI_API_KEY is missing - flashcards, chat, and content generation will fail')
  }

  if (!process.env.YOUTUBE_API_KEY) {
    warnings.push('⚠️ YOUTUBE_API_KEY is missing - video transcription will fail')
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('⚠️ NEXT_PUBLIC_APP_URL is missing - internal API calls may fail on deployment')
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing - database operations will fail')
  }

  // Check for test keys in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
      warnings.push('🚨 Using Clerk TEST keys in PRODUCTION - authentication may fail')
    }
    if (process.env.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
      warnings.push('🚨 Using Clerk TEST secret in PRODUCTION - authentication may fail')
    }
  }

  // Check app URL format
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      warnings.push('⚠️ NEXT_PUBLIC_APP_URL should start with http:// or https://')
    }
    if (url.endsWith('/')) {
      warnings.push('ℹ️ NEXT_PUBLIC_APP_URL should not end with / (will be added automatically)')
    }
  }

  if (warnings.length === 0) {
    warnings.push('✅ All critical environment variables are configured correctly!')
  }

  return warnings
}
