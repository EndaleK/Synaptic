/**
 * Storage Diagnostic Endpoint
 * Tests Supabase storage bucket access
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test 1: List buckets
    console.log('📋 Testing: List all storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketsError.message,
        tests: {
          listBuckets: { success: false, error: bucketsError.message }
        }
      }, { status: 500 })
    }

    console.log('✅ Buckets found:', buckets?.map(b => b.name))

    // Test 2: Check if 'documents' bucket exists
    const documentsBucket = buckets?.find(b => b.name === 'documents')
    const hasDoccumentsBucket = !!documentsBucket

    // Test 3: Try to list files in documents bucket
    let filesListResult: any = { success: false }
    if (hasDoccumentsBucket) {
      console.log('📂 Testing: List files in documents bucket...')
      const { data: files, error: filesError } = await supabase
        .storage
        .from('documents')
        .list('', { limit: 10 })

      if (filesError) {
        console.error('❌ Failed to list files:', filesError)
        filesListResult = { success: false, error: filesError.message }
      } else {
        console.log(`✅ Found ${files?.length || 0} files/folders`)
        filesListResult = {
          success: true,
          count: files?.length || 0,
          sample: files?.slice(0, 3).map(f => f.name)
        }
      }
    }

    // Test 4: Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        listBuckets: {
          success: true,
          bucketsFound: buckets?.map(b => ({
            name: b.name,
            id: b.id,
            public: b.public
          }))
        },
        documentsBucketExists: {
          success: hasDoccumentsBucket,
          details: documentsBucket ? {
            id: documentsBucket.id,
            name: documentsBucket.name,
            public: documentsBucket.public,
            createdAt: documentsBucket.created_at
          } : 'Bucket not found'
        },
        listFiles: filesListResult,
        environment: envCheck
      }
    })
  } catch (error) {
    console.error('❌ Storage test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Storage test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
