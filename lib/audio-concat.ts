/**
 * Server-only audio concatenation utilities
 * Uses ffmpeg for robust MP3 concatenation when mixing providers
 */
import type { AudioSegment } from "./tts-generator"
import { spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

/**
 * Concatenate multiple MP3 audio buffers into a single buffer
 *
 * Uses ffmpeg for robust audio concatenation that handles:
 * - Different sample rates between providers
 * - Different bitrates between providers
 * - Different MP3 encoding settings
 *
 * Falls back to simple concatenation if ffmpeg is not available
 */
export async function concatenateAudioBuffers(segments: AudioSegment[]): Promise<Buffer> {
  if (segments.length === 0) {
    throw new Error("Cannot concatenate empty audio segments")
  }

  if (segments.length === 1) {
    return segments[0].audioBuffer
  }

  console.log(`Concatenating ${segments.length} audio segments...`)

  // Check if we have mixed providers (requires ffmpeg)
  const providers = new Set(segments.map(seg => seg.provider || 'unknown'))
  const hasMixedProviders = providers.size > 1

  if (hasMixedProviders) {
    console.log(`Mixed providers detected: ${Array.from(providers).join(', ')} - using ffmpeg for robust concatenation`)
    try {
      return await concatenateWithFFmpeg(segments)
    } catch (error) {
      console.warn('ffmpeg concatenation failed, falling back to simple concatenation:', error)
      return simpleConcatenate(segments)
    }
  }

  // Single provider - simple concatenation works fine
  return simpleConcatenate(segments)
}

/**
 * Simple buffer concatenation (works for same-provider segments)
 */
function simpleConcatenate(segments: AudioSegment[]): Buffer {
  const buffers = segments.map(seg => seg.audioBuffer)
  const concatenated = Buffer.concat(buffers)
  console.log(`Concatenated audio (simple): ${concatenated.length} bytes`)
  return concatenated
}

/**
 * Use ffmpeg to concatenate audio files with proper re-encoding
 * This handles mixed providers with different encoding settings
 */
async function concatenateWithFFmpeg(segments: AudioSegment[]): Promise<Buffer> {
  // Create temp directory for audio files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-'))
  const tempFiles: string[] = []
  const listFile = path.join(tempDir, 'list.txt')
  const outputFile = path.join(tempDir, 'output.mp3')

  try {
    // Write each segment to a temp file
    for (let i = 0; i < segments.length; i++) {
      const tempFile = path.join(tempDir, `segment_${i.toString().padStart(4, '0')}.mp3`)
      fs.writeFileSync(tempFile, segments[i].audioBuffer)
      tempFiles.push(tempFile)
    }

    // Create ffmpeg concat list file
    const listContent = tempFiles.map(f => `file '${f}'`).join('\n')
    fs.writeFileSync(listFile, listContent)

    // Run ffmpeg to concatenate with re-encoding for consistent output
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',                    // Overwrite output file
        '-f', 'concat',          // Use concat demuxer
        '-safe', '0',            // Allow absolute paths
        '-i', listFile,          // Input list file
        '-c:a', 'libmp3lame',    // Re-encode to MP3
        '-q:a', '2',             // High quality (VBR ~190kbps)
        '-ar', '44100',          // Consistent sample rate
        '-ac', '1',              // Mono audio (speech)
        outputFile
      ])

      let stderr = ''
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`))
        }
      })

      ffmpeg.on('error', (err) => {
        reject(new Error(`ffmpeg spawn error: ${err.message}`))
      })
    })

    // Read the concatenated output
    const outputBuffer = fs.readFileSync(outputFile)
    console.log(`Concatenated audio (ffmpeg): ${outputBuffer.length} bytes`)
    return outputBuffer

  } finally {
    // Cleanup temp files
    try {
      for (const file of tempFiles) {
        if (fs.existsSync(file)) fs.unlinkSync(file)
      }
      if (fs.existsSync(listFile)) fs.unlinkSync(listFile)
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile)
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir)
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError)
    }
  }
}
