/**
 * Learning History Module
 *
 * Provides learning performance context for AI personalization.
 * Use this to make the AI teacher aware of student's weak areas,
 * knowledge gaps, and learning patterns.
 */

export {
  getLearningHistoryContext,
  formatLearningContextForAI,
  getLearningContextForPrompt,
  isWeakTopic,
  getTopicAdvice,
  type LearningHistoryContext,
  type WeakTopic,
  type StrugglePattern,
  type FormattedLearningContext,
} from './learning-history-context'
