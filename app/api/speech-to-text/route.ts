import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import OpenAI from "openai"

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Speech-to-text service not configured" },
        { status: 503 }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB for Whisper)
    const MAX_SIZE = 25 * 1024 * 1024
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 25MB." },
        { status: 400 }
      )
    }

    console.log(`🎤 Processing audio: ${audioFile.name}, size: ${(audioFile.size / 1024).toFixed(1)}KB, type: ${audioFile.type}`)

    // Convert to File object that OpenAI expects
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // Auto-detect if not specified
      response_format: "text"
    })

    console.log(`✅ Transcription complete: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`)

    return NextResponse.json({
      text: transcription,
      success: true
    })
  } catch (error) {
    console.error("Speech-to-text error:", error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `Transcription failed: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}
