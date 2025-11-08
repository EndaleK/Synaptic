// API Route: GET /api/debug/r2-config
// Diagnostic endpoint to verify R2 configuration in production
// Shows masked credentials to verify environment variables are loaded correctly

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  try {
    // Require authentication for security
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mask credentials for security (show first 8 and last 4 chars only)
    const maskCredential = (value: string | undefined, length = 32) => {
      if (!value) return 'NOT SET'
      if (value.length < 12) return 'INVALID (too short)'
      return `${value.slice(0, 8)}...${value.slice(-4)} (${value.length} chars)`
    }

    const config = {
      endpoint: process.env.R2_ENDPOINT || 'NOT SET',
      accessKeyId: maskCredential(process.env.R2_ACCESS_KEY_ID, 32),
      secretAccessKey: maskCredential(process.env.R2_SECRET_ACCESS_KEY, 64),
      bucketName: process.env.R2_BUCKET_NAME || 'NOT SET',
      accountId: process.env.R2_ACCOUNT_ID || 'NOT SET',

      // Show raw values for first/last chars to verify correctness
      accessKeyIdStart: process.env.R2_ACCESS_KEY_ID?.slice(0, 8) || 'N/A',
      accessKeyIdEnd: process.env.R2_ACCESS_KEY_ID?.slice(-4) || 'N/A',
      secretAccessKeyStart: process.env.R2_SECRET_ACCESS_KEY?.slice(0, 8) || 'N/A',
      secretAccessKeyEnd: process.env.R2_SECRET_ACCESS_KEY?.slice(-4) || 'N/A',
    }

    // Expected values for comparison
    const expected = {
      accessKeyIdStart: '6757762B',
      accessKeyIdEnd: '3a99',
      secretAccessKeyStart: 'b48723d1',
      secretAccessKeyEnd: '98a6',
      endpoint: 'https://3a6b1b00e88e6ee72792e64a8421aef9.r2.cloudflarestorage.com',
      bucketName: 'synaptic-documents',
      accountId: '3a6b1b00e88e6ee72792e64a8421aef9',
    }

    // Check if credentials match expected values
    const matches = {
      accessKeyId: config.accessKeyIdStart === expected.accessKeyIdStart &&
                    config.accessKeyIdEnd === expected.accessKeyIdEnd,
      secretAccessKey: config.secretAccessKeyStart === expected.secretAccessKeyStart &&
                       config.secretAccessKeyEnd === expected.secretAccessKeyEnd,
      endpoint: config.endpoint === expected.endpoint,
      bucketName: config.bucketName === expected.bucketName,
      accountId: config.accountId === expected.accountId,
    }

    const allMatch = Object.values(matches).every(m => m === true)

    return NextResponse.json({
      environment: process.env.VERCEL_ENV || 'local',
      timestamp: new Date().toISOString(),
      r2Config: config,
      expected: expected,
      matches: matches,
      status: allMatch ? '✅ All credentials match expected values' : '❌ Credential mismatch detected',
      recommendation: allMatch
        ? 'R2 credentials are correctly configured. If uploads still fail, check R2 bucket permissions in Cloudflare dashboard.'
        : 'Update Vercel environment variables to match expected values, then redeploy.',
    })
  } catch (error) {
    console.error('R2 config diagnostic error:', error)
    return NextResponse.json(
      {
        error: 'Diagnostic check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
