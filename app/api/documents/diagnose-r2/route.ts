// API Route: GET /api/documents/diagnose-r2?path=...
// Diagnoses R2 storage configuration and file existence

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    // Check R2 configuration
    const r2Config = {
      endpoint: process.env.R2_ENDPOINT ? '✓ Configured' : '✗ Missing',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ? '✓ Configured' : '✗ Missing',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ? '✓ Configured' : '✗ Missing',
      bucketName: process.env.R2_BUCKET_NAME || 'synaptic-documents (default)',
      publicUrl: process.env.R2_PUBLIC_URL || '✗ Not configured',
    }

    const isR2Configured = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)

    if (!isR2Configured) {
      return NextResponse.json({
        configured: false,
        config: r2Config,
        message: 'R2 is not fully configured. Missing required environment variables.'
      })
    }

    // Try to check if file exists in R2
    try {
      const { fileExistsInR2, getR2FileMetadata } = await import('@/lib/r2-storage')

      const exists = await fileExistsInR2(filePath)

      if (exists) {
        // Get file metadata
        const metadata = await getR2FileMetadata(filePath)

        return NextResponse.json({
          configured: true,
          config: r2Config,
          file: {
            path: filePath,
            exists: true,
            size: metadata.size,
            contentType: metadata.contentType,
            lastModified: metadata.lastModified,
          },
          message: 'File exists in R2 storage'
        })
      } else {
        return NextResponse.json({
          configured: true,
          config: r2Config,
          file: {
            path: filePath,
            exists: false,
          },
          message: 'File does NOT exist in R2 storage. It may have failed to upload or was deleted.'
        })
      }
    } catch (r2Error) {
      return NextResponse.json({
        configured: true,
        config: r2Config,
        file: {
          path: filePath,
          exists: false,
          error: r2Error instanceof Error ? r2Error.message : 'Unknown error',
        },
        message: 'Error checking R2 storage. This could indicate incorrect credentials or bucket name.'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('R2 diagnostics error:', error)
    return NextResponse.json(
      {
        error: 'Diagnostic check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
