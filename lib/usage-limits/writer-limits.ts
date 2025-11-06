/**
 * Writer Feature Usage Limits
 *
 * Defines freemium limits for the Writer feature
 */

export interface WriterLimits {
  // AI Analysis limits
  aiAnalysisPerDay: number
  grammarCheckPerDay: number
  paraphrasePerDay: number
  thesisAnalysisPerDay: number

  // Export limits
  canExportPDF: boolean
  canExportDOCX: boolean

  // Feature access
  canUseCitations: boolean
  canUseAdvancedFormatting: boolean
  canUseVersionHistory: boolean

  // Document limits
  maxEssays: number
  maxWordsPerEssay: number
}

export const WRITER_LIMITS = {
  free: {
    aiAnalysisPerDay: 5,
    grammarCheckPerDay: 10,
    paraphrasePerDay: 5,
    thesisAnalysisPerDay: 3,
    canExportPDF: false,
    canExportDOCX: false,
    canUseCitations: true, // Basic citations allowed
    canUseAdvancedFormatting: true,
    canUseVersionHistory: false,
    maxEssays: 10,
    maxWordsPerEssay: 5000,
  } as WriterLimits,

  premium: {
    aiAnalysisPerDay: Infinity,
    grammarCheckPerDay: Infinity,
    paraphrasePerDay: Infinity,
    thesisAnalysisPerDay: Infinity,
    canExportPDF: true,
    canExportDOCX: true,
    canUseCitations: true,
    canUseAdvancedFormatting: true,
    canUseVersionHistory: true,
    maxEssays: Infinity,
    maxWordsPerEssay: Infinity,
  } as WriterLimits,
}

export function getWriterLimits(tier: 'free' | 'premium'): WriterLimits {
  return WRITER_LIMITS[tier]
}
