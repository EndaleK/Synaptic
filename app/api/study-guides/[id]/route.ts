import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()

    // Get study guide with document info
    const { data: studyGuide, error } = await supabase
      .from('study_guides')
      .select(`
        *,
        documents (
          file_name,
          file_type
        )
      `)
      .eq('id', id)
      .single()

    if (error || !studyGuide) {
      return NextResponse.json({ error: "Study guide not found" }, { status: 404 })
    }

    // Verify ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile || studyGuide.user_id !== profile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Increment download count
    await supabase
      .from('study_guides')
      .update({ download_count: (studyGuide.download_count || 0) + 1 })
      .eq('id', id)

    logger.info('Study guide retrieved', { userId, studyGuideId: id })

    return NextResponse.json({ studyGuide }, { status: 200 })

  } catch (error) {
    logger.error('Error fetching study guide:', error)
    return NextResponse.json(
      { error: "Failed to fetch study guide" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()

    // Get study guide to verify ownership and get PDF URL
    const { data: studyGuide, error: fetchError } = await supabase
      .from('study_guides')
      .select('user_id, pdf_url')
      .eq('id', id)
      .single()

    if (fetchError || !studyGuide) {
      return NextResponse.json({ error: "Study guide not found" }, { status: 404 })
    }

    // Verify ownership
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!profile || studyGuide.user_id !== profile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete PDF from storage if exists
    if (studyGuide.pdf_url) {
      const path = studyGuide.pdf_url.split('/').slice(-2).join('/')
      await supabase.storage.from('documents').remove([path])
    }

    // Delete study guide from database
    const { error: deleteError } = await supabase
      .from('study_guides')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    logger.info('Study guide deleted', { userId, studyGuideId: id })

    return NextResponse.json({ message: "Study guide deleted successfully" }, { status: 200 })

  } catch (error) {
    logger.error('Error deleting study guide:', error)
    return NextResponse.json(
      { error: "Failed to delete study guide" },
      { status: 500 }
    )
  }
}
