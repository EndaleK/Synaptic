import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export const dynamic = 'force-dynamic'

/**
 * GET /api/jurisdictions
 * Get all jurisdiction requirements (provinces/states)
 * Query params:
 *   - country: Filter by country (CA, US)
 *   - code: Get specific jurisdiction by code
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    const authResult = await auth()
    const userId = authResult.userId
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country')
    const code = searchParams.get('code')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('state_compliance_templates')
      .select('*')
      .eq('is_active', true)
      .order('jurisdiction_name')

    if (country) {
      query = query.eq('country', country.toUpperCase())
    }

    if (code) {
      query = query.eq('state_code', code.toUpperCase())
    }

    const { data: jurisdictions, error } = await query

    if (error) {
      logger.error('Failed to fetch jurisdictions', error, { userId })
      return NextResponse.json({ error: "Failed to fetch jurisdictions" }, { status: 500 })
    }

    // Transform to a cleaner format
    const formatted = (jurisdictions || []).map(j => ({
      code: j.state_code,
      name: j.state_name,  // Column is state_name, not jurisdiction_name
      country: j.country || 'US',
      type: j.jurisdiction_type || 'state',
      regulationLevel: j.requirement_level,  // Column is requirement_level, not regulation_level
      requirements: j.requirements,
      links: j.resource_links,  // Column is resource_links, not useful_links
      notes: j.notes
    }))

    const duration = Date.now() - startTime
    logger.api('GET', '/api/jurisdictions', 200, duration, { userId, count: formatted.length })

    return NextResponse.json({
      success: true,
      jurisdictions: formatted
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Jurisdictions fetch error', error, {})
    logger.api('GET', '/api/jurisdictions', 500, duration, { error: errorMessage })

    return NextResponse.json(
      { error: errorMessage || "Failed to fetch jurisdictions" },
      { status: 500 }
    )
  }
}
