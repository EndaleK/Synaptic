/**
 * API Route: POST /api/text-to-speech
 *
 * Converts text to speech using OpenAI TTS API.
 * Returns audio as a blob for playback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Text-to-speech service not configured' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { text, voice = 'nova', speed = 1.0 } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    // Validate text length (OpenAI TTS has a 4096 character limit)
    const truncatedText = text.substring(0, 4096)

    // Validate voice
    const validVoices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    const selectedVoice: TTSVoice = validVoices.includes(voice as TTSVoice) ? voice : 'nova'

    // Validate speed (0.25 to 4.0)
    const selectedSpeed = Math.min(4.0, Math.max(0.25, speed))

    console.log(`🔊 Generating TTS: ${truncatedText.length} chars, voice: ${selectedVoice}, speed: ${selectedSpeed}`)

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: truncatedText,
      speed: selectedSpeed,
      response_format: 'mp3'
    })

    // Get the audio as a buffer
    const audioBuffer = await response.arrayBuffer()

    console.log(`✅ TTS generated: ${(audioBuffer.byteLength / 1024).toFixed(1)}KB`)

    // Return audio as blob
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Text-to-speech error:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `TTS failed: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
