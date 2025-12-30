import type { AudioSegment } from "./tts-generator"

/**
 * Generate a transcript with timestamps from audio segments
 */
export interface TranscriptEntry {
  speaker: 'host_a' | 'host_b'
  speakerName: string
  text: string
  startTime: number // seconds
  endTime: number // seconds
}

export function generateTranscript(segments: AudioSegment[]): TranscriptEntry[] {
  const transcript: TranscriptEntry[] = []
  let currentTime = 0

  for (const segment of segments) {
    transcript.push({
      speaker: segment.speaker,
      speakerName: segment.speaker === 'host_a' ? 'Alex' : 'Jordan',
      text: segment.text,
      startTime: currentTime,
      endTime: currentTime + segment.duration
    })

    currentTime += segment.duration
  }

  return transcript
}

/**
 * Format time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format time in seconds to detailed format (HH:MM:SS or MM:SS)
 */
export function formatDetailedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * Validate MP3 buffer (basic check for MP3 header)
 */
export function isValidMP3Buffer(buffer: Buffer): boolean {
  if (buffer.length < 3) {
    return false
  }

  // Check for ID3v2 tag (starts with "ID3") or MP3 frame sync (0xFF 0xFB/0xFA/0xF3/0xF2)
  const hasID3Tag = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33
  const hasFrameSync = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0

  return hasID3Tag || hasFrameSync
}
