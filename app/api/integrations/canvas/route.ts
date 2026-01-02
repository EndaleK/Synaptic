/**
 * API Route: /api/integrations/canvas
 *
 * GET: Get Canvas connection status and courses
 * POST: Connect to Canvas (save access token)
 * DELETE: Disconnect Canvas
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createCanvasClient } from '@/lib/integrations/canvas-lms'

export const runtime = 'nodejs'

/**
 * GET /api/integrations/canvas
 * Get connection status and available courses
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile with Canvas tokens
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, canvas_base_url, canvas_access_token')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if connected
    if (!profile.canvas_access_token || !profile.canvas_base_url) {
      return NextResponse.json({
        connected: false,
        configured: true,
        message: 'Canvas not connected. Provide your Canvas URL and access token.'
      })
    }

    try {
      // Create Canvas client and fetch courses
      const canvas = createCanvasClient({
        baseUrl: profile.canvas_base_url,
        accessToken: profile.canvas_access_token
      })

      // Test connection first
      await canvas.testConnection()

      // Fetch courses
      const courses = await canvas.getCourses()

      // Filter to active courses
      const activeCourses = courses
        .filter(c => c.workflow_state === 'available')
        .map(c => ({
          id: c.id.toString(),
          name: c.name,
          courseCode: c.course_code,
          totalStudents: c.total_students,
          role: c.enrollments?.[0]?.type || 'student'
        }))

      return NextResponse.json({
        connected: true,
        configured: true,
        baseUrl: profile.canvas_base_url,
        courses: activeCourses
      })
    } catch (error) {
      console.error('[Canvas] API error:', error)

      return NextResponse.json({
        connected: false,
        configured: true,
        message: 'Connection failed. Please check your Canvas credentials.'
      })
    }
  } catch (error) {
    console.error('[Canvas] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get Canvas status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/canvas
 * Connect to Canvas with provided credentials
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { baseUrl, accessToken } = body

    if (!baseUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing baseUrl or accessToken' },
        { status: 400 }
      )
    }

    // Normalize base URL
    let normalizedUrl = baseUrl.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }
    // Remove trailing slash
    normalizedUrl = normalizedUrl.replace(/\/$/, '')

    // Test the connection
    try {
      const canvas = createCanvasClient({
        baseUrl: normalizedUrl,
        accessToken
      })

      const user = await canvas.testConnection()
      console.log('[Canvas] Connected as:', user.name)
    } catch (error) {
      console.error('[Canvas] Connection test failed:', error)
      return NextResponse.json(
        { error: 'Failed to connect to Canvas. Please check your credentials.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Save Canvas credentials
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        canvas_base_url: normalizedUrl,
        canvas_access_token: accessToken
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[Canvas] Save error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save Canvas credentials' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Canvas'
    })
  } catch (error) {
    console.error('[Canvas] Connect error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Canvas' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations/canvas
 * Disconnect Canvas
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Clear Canvas credentials
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        canvas_base_url: null,
        canvas_access_token: null
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('[Canvas] Disconnect error:', updateError)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Canvas] Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
