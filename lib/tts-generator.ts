import OpenAI from "openai"
import type { ScriptLine, Speaker } from "./podcast-generator"

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type TTSLanguage = 'en-us' | 'en-gb' | 'ja' | 'zh' | 'es' | 'fr' | 'hi' | 'it' | 'pt-br'

export interface AudioSegment {
  speaker: Speaker
  audioBuffer: Buffer
  duration: number // in seconds
  text: string
  provider?: 'lemonfox' | 'openai' // Track which TTS provider was used
}

/**
 * Voice mapping for podcast hosts
 * - Host A (Alex): Uses 'alloy' - warm, balanced male voice
 * - Host B (Jordan): Uses 'nova' - friendly, engaging female voice
 * Works with both OpenAI and Lemonfox.ai (they share voice names!)
 */
const VOICE_MAP: Record<Speaker, TTSVoice> = {
  host_a: 'alloy',
  host_b: 'nova'
}

/**
 * Generate speech using Lemonfox.ai TTS API
 * 83% cheaper than OpenAI ($2.50 vs $15 per 1M characters)
 */
async function generateSpeechWithLemonfox(
  text: string,
  voice: TTSVoice,
  language: TTSLanguage = 'en-us'
): Promise<Buffer> {
  if (!process.env.LEMONFOX_API_KEY) {
    throw new Error("Lemonfox API key not configured")
  }

  const response = await fetch("https://api.lemonfox.ai/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.LEMONFOX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: text,
      voice: voice,
      response_format: "mp3",
      language: language
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Lemonfox API error (${response.status}): ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generate speech using OpenAI TTS (fallback)
 */
async function generateSpeechWithOpenAI(
  text: string,
  voice: TTSVoice
): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const mp3Response = await openai.audio.speech.create({
    model: "tts-1",
    voice: voice,
    input: text,
    speed: 1.0
  })

  const arrayBuffer = await mp3Response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generate speech audio from a single script line
 * Tries Lemonfox.ai first (cheaper), falls back to OpenAI if needed
 */
export async function generateSpeechForLine(
  line: ScriptLine,
  language: TTSLanguage = 'en-us'
): Promise<AudioSegment> {
  const voice = VOICE_MAP[line.speaker]
  let buffer: Buffer
  let provider: 'lemonfox' | 'openai'

  console.log(`Generating TTS for ${line.speaker}: "${line.text.substring(0, 50)}..." (language: ${language})`)

  // Try Lemonfox.ai first (83% cheaper!)
  if (process.env.LEMONFOX_API_KEY) {
    try {
      console.log(`[TTS] Trying Lemonfox.ai for ${line.speaker}...`)
      buffer = await generateSpeechWithLemonfox(line.text, voice, language)
      provider = 'lemonfox'
      console.log(`[TTS] ✓ Lemonfox.ai succeeded for ${line.speaker}`)
    } catch (lemonfoxError: any) {
      console.warn(`[TTS] Lemonfox.ai failed for ${line.speaker}: ${lemonfoxError.message}`)
      console.log(`[TTS] Falling back to OpenAI for ${line.speaker}...`)

      // Fall back to OpenAI
      try {
        buffer = await generateSpeechWithOpenAI(line.text, voice)
        provider = 'openai'
        console.log(`[TTS] ✓ OpenAI fallback succeeded for ${line.speaker}`)
      } catch (openaiError: any) {
        console.error(`[TTS] Both providers failed for ${line.speaker}`)
        throw new Error(`TTS generation failed: Lemonfox (${lemonfoxError.message}), OpenAI (${openaiError.message})`)
      }
    }
  } else {
    // No Lemonfox key configured, use OpenAI directly
    console.log(`[TTS] Lemonfox.ai not configured, using OpenAI for ${line.speaker}...`)
    try {
      buffer = await generateSpeechWithOpenAI(line.text, voice)
      provider = 'openai'
      console.log(`[TTS] ✓ OpenAI succeeded for ${line.speaker}`)
    } catch (error: any) {
      console.error(`[TTS] OpenAI failed for ${line.speaker}:`, error)
      throw new Error(`Failed to generate speech: ${error.message}`)
    }
  }

  // Estimate duration (neither API provides exact duration)
  // Average speaking rate: ~150 words per minute
  const wordCount = line.text.split(/\s+/).length
  const estimatedDuration = (wordCount / 150) * 60 // in seconds

  const segment: AudioSegment = {
    speaker: line.speaker,
    audioBuffer: buffer,
    duration: estimatedDuration,
    text: line.text,
    provider
  }

  return segment
}

/**
 * Generate audio for entire podcast script
 * Returns array of audio segments (one per line)
 */
export async function generatePodcastAudio(
  lines: ScriptLine[],
  language: TTSLanguage = 'en-us',
  onProgress?: (current: number, total: number) => void
): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = []

  console.log(`Starting TTS generation for ${lines.length} lines (language: ${language})...`)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    try {
      const segment = await generateSpeechForLine(line, language)
      segments.push(segment)

      if (onProgress) {
        onProgress(i + 1, lines.length)
      }

      // Small delay to avoid rate limiting
      if (i < lines.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

    } catch (error) {
      console.error(`Failed to generate audio for line ${i}:`, error)
      throw error
    }
  }

  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0)
  const providers = segments.reduce((acc, seg) => {
    acc[seg.provider || 'unknown'] = (acc[seg.provider || 'unknown'] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log(`TTS generation complete: ${segments.length} segments, ${Math.round(totalDuration)}s total`)
  console.log(`Provider usage:`, providers)

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
