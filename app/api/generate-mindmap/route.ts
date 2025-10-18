import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generateMindMap, validateMindMap } from "@/lib/mindmap-generator"

export const maxDuration = 60 // 1 minute max execution time

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const {
      documentId,
      maxNodes = 25,
      maxDepth = 3
    } = body

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    console.log(`[Mind Map Generation] Starting for document ${documentId}, user ${userId}`)

    // Initialize Supabase
    const supabase = await createClient()

    // Fetch document (use userId directly)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, user_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      console.error("Document fetch error:", docError)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    if (!document.extracted_text) {
      return NextResponse.json(
        { error: "Document has no extracted text" },
        { status: 400 }
      )
    }

    // Generate mind map
    console.log(`[Mind Map] Generating...`)
    const mindMapData = await generateMindMap({
      text: document.extracted_text,
      maxNodes,
      maxDepth
    })

    // Validate mind map
    const isValid = validateMindMap(mindMapData)
    if (!isValid) {
      console.warn("Mind map validation failed, but continuing...")
    }

    // Save to database
    const { data: mindMap, error: dbError } = await supabase
      .from('mindmaps')
      .insert({
        user_id: userId,
        document_id: documentId,
        title: mindMapData.title,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        layout_data: mindMapData.metadata
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database save error:", dbError)
      // Don't fail the request, mind map is still generated
    }

    // Track usage
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      action_type: 'mindmap_generation',
      tokens_used: mindMapData.nodes.reduce((sum, node) => sum + node.label.length + node.description.length, 0),
      metadata: {
        document_id: documentId,
        node_count: mindMapData.nodes.length,
        edge_count: mindMapData.edges.length
      }
    })

    console.log(`[Mind Map] Generation complete: ${mindMapData.nodes.length} nodes, ${mindMapData.edges.length} edges`)

    // Return response
    return NextResponse.json({
      success: true,
      mindMap: {
        id: mindMap?.id,
        title: mindMapData.title,
        nodes: mindMapData.nodes,
        edges: mindMapData.edges,
        metadata: mindMapData.metadata
      }
    })

  } catch (error: any) {
    console.error("[Mind Map Generation] Error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to generate mind map",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
