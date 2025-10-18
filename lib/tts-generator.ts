import OpenAI from "openai"
import type { ScriptLine, Speaker } from "./podcast-generator"

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface AudioSegment {
  speaker: Speaker
  audioBuffer: Buffer
  duration: number // in seconds
  text: string
}

/**
 * Voice mapping for podcast hosts
 * - Host A (Alex): Uses 'alloy' - warm, balanced male voice
 * - Host B (Jordan): Uses 'nova' - friendly, engaging female voice
 */
const VOICE_MAP: Record<Speaker, TTSVoice> = {
  host_a: 'alloy',
  host_b: 'nova'
}

/**
 * Generate speech audio from a single script line using OpenAI TTS
 */
export async function generateSpeechForLine(
  line: ScriptLine
): Promise<AudioSegment> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const voice = VOICE_MAP[line.speaker]

  try {
    console.log(`Generating TTS for ${line.speaker}: "${line.text.substring(0, 50)}..."`)

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1", // Use tts-1-hd for higher quality (2x cost)
      voice: voice,
      input: line.text,
      speed: 1.0 // Can adjust: 0.25 to 4.0
    })

    // Convert response to buffer
    const arrayBuffer = await mp3Response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Estimate duration (OpenAI TTS doesn't provide exact duration)
    // Average speaking rate: ~150 words per minute
    const wordCount = line.text.split(/\s+/).length
    const estimatedDuration = (wordCount / 150) * 60 // in seconds

    const segment: AudioSegment = {
      speaker: line.speaker,
      audioBuffer: buffer,
      duration: estimatedDuration,
      text: line.text
    }

    return segment

  } catch (error: any) {
    console.error(`TTS generation error for ${line.speaker}:`, error)
    throw new Error(`Failed to generate speech: ${error.message}`)
  }
}

/**
 * Generate audio for entire podcast script
 * Returns array of audio segments (one per line)
 */
export async function generatePodcastAudio(
  lines: ScriptLine[],
  onProgress?: (current: number, total: number) => void
): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = []

  console.log(`Starting TTS generation for ${lines.length} lines...`)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    try {
      const segment = await generateSpeechForLine(line)
      segments.push(segment)

      if (onProgress) {
        onProgress(i + 1, lines.length)
      }

      // Small delay to avoid rate limiting (OpenAI allows 3 requests/min on free tier)
      // Comment this out if you have paid tier
      if (i < lines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

    } catch (error) {
      console.error(`Failed to generate audio for line ${i}:`, error)
      throw error
    }
  }

  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
  console.log(`TTS generation complete: ${segments.length} segments, ${Math.round(totalDuration)}s total`)

  return segments
}

/**
 * Calculate total duration of audio segments
 */
export function calculateTotalDuration(segments: AudioSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.duration, 0)
}

/**
 * Estimate file size of concatenated audio
 * MP3 at 128kbps ≈ 16KB per second
 */
export function estimateFileSize(durationInSeconds: number): number {
  return Math.ceil(durationInSeconds * 16 * 1024) // bytes
}
