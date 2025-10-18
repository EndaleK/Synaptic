import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { generatePodcastScript, type PodcastFormat } from "@/lib/podcast-generator"
import { generatePodcastAudio } from "@/lib/tts-generator"
import { concatenateAudioBuffers, generateTranscript } from "@/lib/audio-utils"

export const maxDuration = 300 // 5 minutes max execution time (Vercel limit)

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
      format = 'deep-dive',
      customPrompt,
      targetDuration = 10
    } = body

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    console.log(`[Podcast Generation] Starting for document ${documentId}, user ${userId}`)

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

    // Step 1: Generate podcast script
    console.log(`[Podcast] Generating script...`)
    const script = await generatePodcastScript({
      text: document.extracted_text,
      format: format as PodcastFormat,
      customPrompt,
      targetDuration
    })

    console.log(`[Podcast] Script generated: ${script.lines.length} lines`)

    // Step 2: Generate audio for each line
    console.log(`[Podcast] Generating audio...`)
    const audioSegments = await generatePodcastAudio(script.lines)

    // Step 3: Concatenate audio segments
    console.log(`[Podcast] Concatenating audio...`)
    const audioBuffer = concatenateAudioBuffers(audioSegments)

    // Step 4: Generate transcript with timestamps
    const transcript = generateTranscript(audioSegments)
    const totalDuration = transcript[transcript.length - 1]?.endTime || script.estimatedDuration

    // Step 5: Upload to Supabase Storage
    const fileName = `${userId}/${documentId}_${Date.now()}.mp3`
    console.log(`[Podcast] Uploading to storage: ${fileName}`)

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('podcasts')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        { error: `Failed to upload audio: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('podcasts')
      .getPublicUrl(uploadData.path)

    const audioUrl = urlData.publicUrl

    // Step 6: Save podcast metadata to database
    const { data: podcast, error: dbError } = await supabase
      .from('podcasts')
      .insert({
        user_id: userId,
        document_id: documentId,
        title: script.title,
        script: JSON.stringify(script.lines),
        voice_id: 'alloy_nova', // Indicates we used both voices
        audio_url: audioUrl,
        duration_seconds: Math.ceil(totalDuration),
        file_size: audioBuffer.length,
        generation_status: 'completed'
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database save error:", dbError)
      // Don't fail the request, audio is already uploaded
    }

    // Step 7: Track usage
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      action_type: 'podcast_generation',
      tokens_used: script.lines.reduce((sum, line) => sum + line.text.length, 0),
      metadata: {
        document_id: documentId,
        duration: Math.ceil(totalDuration),
        format
      }
    })

    console.log(`[Podcast] Generation complete: ${audioUrl}`)

    // Return response
    return NextResponse.json({
      success: true,
      podcast: {
        id: podcast?.id,
        title: script.title,
        description: script.description,
        audioUrl,
        duration: Math.ceil(totalDuration),
        fileSize: audioBuffer.length,
        transcript,
        script: script.lines
      }
    })

  } catch (error: any) {
    console.error("[Podcast Generation] Error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to generate podcast",
        details: error.stack
      },
      { status: 500 }
    )
  }
}
