/**
 * Video Feature Usage Limits
 *
 * Defines freemium limits for the Video feature
 */

export interface VideoLimits {
  // Video processing limits
  videosPerDay: number
  maxVideoDuration: number // in minutes

  // Content generation limits
  canGenerateFlashcards: boolean
  canGenerateSummary: boolean
  canExtractTimestamps: boolean

  // Advanced features
  canDownloadTranscript: boolean
  canExportNotes: boolean
}

export const VIDEO_LIMITS = {
  free: {
    videosPerDay: 3,
    maxVideoDuration: 30, // 30 minutes max for free tier
    canGenerateFlashcards: false, // Premium only
    canGenerateSummary: true, // Basic summaries allowed
    canExtractTimestamps: true,
    canDownloadTranscript: false,
    canExportNotes: false,
  } as VideoLimits,

  premium: {
    videosPerDay: Infinity,
    maxVideoDuration: Infinity,
    canGenerateFlashcards: true,
    canGenerateSummary: true,
    canExtractTimestamps: true,
    canDownloadTranscript: true,
    canExportNotes: true,
  } as VideoLimits,
}

export function getVideoLimits(tier: 'free' | 'premium'): VideoLimits {
  return VIDEO_LIMITS[tier]
}
