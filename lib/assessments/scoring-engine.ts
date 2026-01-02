// Scoring Engine for Assessment Results

import type { AssessmentQuestion, AssessmentResults, ScoreMap } from './types'
import type { LearningStyle, PreferredMode } from '@/lib/supabase/types'

export function calculateAssessmentResults(
  questions: AssessmentQuestion[],
  answers: Record<number, number>
): AssessmentResults & { recommended_mode: PreferredMode; dominant_learning_style: LearningStyle } {
  // Initialize all possible scores
  const scores: Record<string, number> = {
    // VARK
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    reading_writing: 0,

    // Multiple Intelligences
    linguistic: 0,
    logical_mathematical: 0,
    spatial: 0,
    bodily_kinesthetic: 0,
    musical: 0,
    interpersonal: 0,
    intrapersonal: 0,
    naturalistic: 0,

    // Environmental
    quiet_environment: 0,
    group_learning: 0,
    frequent_breaks: 0,
    background_music: 0,
    structured_materials: 0,
    flexible_approach: 0,

    // Teaching Style
    socratic: 0,
    direct: 0,
  }

  // Calculate scores from answers
  Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
    const question = questions[parseInt(questionIndex)]
    if (!question) return

    const option = question.options[optionIndex]
    if (!option) return

    // Add scores from this option
    Object.entries(option.scores).forEach(([key, value]) => {
      if (typeof value === 'number') {
        scores[key] = (scores[key] || 0) + value
      }
    })
  })

  // Build VARK scores
  const vark_scores = {
    visual: scores.visual || 0,
    auditory: scores.auditory || 0,
    kinesthetic: scores.kinesthetic || 0,
    reading_writing: scores.reading_writing || 0,
  }

  // Build Intelligence scores (if any questions addressed these)
  const intelligence_scores = {
    linguistic: scores.linguistic || 0,
    logical_mathematical: scores.logical_mathematical || 0,
    spatial: scores.spatial || 0,
    bodily_kinesthetic: scores.bodily_kinesthetic || 0,
    musical: scores.musical || 0,
    interpersonal: scores.interpersonal || 0,
    intrapersonal: scores.intrapersonal || 0,
    naturalistic: scores.naturalistic || 0,
  }

  // Build Environmental preferences
  const environmental_preferences = {
    quiet_environment: scores.quiet_environment || 0,
    group_learning: scores.group_learning || 0,
    frequent_breaks: scores.frequent_breaks || 0,
    background_music: scores.background_music || 0,
    structured_materials: scores.structured_materials || 0,
    flexible_approach: scores.flexible_approach || 0,
  }

  // Build Teaching Style preferences
  const teaching_style_scores = {
    socratic: scores.socratic || 0,
    direct: scores.direct || 0,
  }

  // Calculate teaching style preference (percentage 0-100)
  const totalTeachingScore = teaching_style_scores.socratic + teaching_style_scores.direct
  const socraticPercentage = totalTeachingScore > 0
    ? Math.round((teaching_style_scores.socratic / totalTeachingScore) * 100)
    : 50 // Default to balanced if no teaching style questions answered

  // Determine teaching style preference
  let teaching_style_preference: 'socratic' | 'direct' | 'mixed' = 'mixed'
  if (socraticPercentage >= 65) {
    teaching_style_preference = 'socratic'
  } else if (socraticPercentage <= 35) {
    teaching_style_preference = 'direct'
  }

  // Determine dominant VARK style
  const maxVarkScore = Math.max(
    vark_scores.visual,
    vark_scores.auditory,
    vark_scores.kinesthetic,
    vark_scores.reading_writing
  )

  // Check if balanced (mixed learner)
  const varkValues = Object.values(vark_scores)
  const avgVarkScore = varkValues.reduce((a, b) => a + b, 0) / varkValues.length
  const isBalanced = varkValues.every(score => Math.abs(score - avgVarkScore) <= 3)

  let dominant_learning_style: LearningStyle = 'mixed'

  if (!isBalanced) {
    if (vark_scores.visual === maxVarkScore) dominant_learning_style = 'visual'
    else if (vark_scores.auditory === maxVarkScore) dominant_learning_style = 'auditory'
    else if (vark_scores.kinesthetic === maxVarkScore) dominant_learning_style = 'kinesthetic'
    else if (vark_scores.reading_writing === maxVarkScore) dominant_learning_style = 'reading_writing'
  }

  // Determine secondary styles (within 20% of dominant)
  const secondary_styles: string[] = []
  Object.entries(vark_scores).forEach(([style, score]) => {
    const styleName = style.replace('_', ' ')
    if (score >= maxVarkScore * 0.8 && score < maxVarkScore) {
      secondary_styles.push(styleName)
    }
  })

  // Add dominant intelligence if significant
  const maxIntelligenceScore = Math.max(...Object.values(intelligence_scores))
  if (maxIntelligenceScore > 5) {
    const dominantIntelligence = Object.entries(intelligence_scores)
      .find(([_, score]) => score === maxIntelligenceScore)?.[0]
    if (dominantIntelligence) {
      secondary_styles.push(dominantIntelligence.replace('_', ' '))
    }
  }

  // Recommend learning mode based on comprehensive profile
  const recommended_mode: PreferredMode = determineRecommendedMode(
    dominant_learning_style,
    intelligence_scores,
    environmental_preferences
  )

  return {
    vark_scores,
    intelligence_scores,
    environmental_preferences,
    teaching_style_scores,
    teaching_style_preference,
    socratic_percentage: socraticPercentage,
    dominant_style: dominant_learning_style,
    secondary_styles,
    recommended_mode,
    dominant_learning_style,
  }
}

function determineRecommendedMode(
  dominant_style: LearningStyle,
  intelligence_scores: Record<string, number>,
  environmental_preferences: Record<string, number>
): PreferredMode {
  // Start with VARK-based recommendation
  let mode: PreferredMode = 'flashcards'

  if (dominant_style === 'visual' || intelligence_scores.spatial > 8) {
    mode = 'mindmap'
  } else if (dominant_style === 'auditory' || intelligence_scores.musical > 8) {
    mode = 'podcast'
  } else if (
    dominant_style === 'kinesthetic' ||
    dominant_style === 'reading_writing' ||
    intelligence_scores.interpersonal > 8 ||
    environmental_preferences.group_learning > 6
  ) {
    mode = 'chat'
  }

  // Default to flashcards for mixed or reading/writing with structure preference
  if (
    dominant_style === 'mixed' ||
    (dominant_style === 'reading_writing' && environmental_preferences.structured_materials > 6)
  ) {
    mode = 'flashcards'
  }

  return mode
}

export function getStyleDescription(style: LearningStyle): string {
  switch (style) {
    case 'visual':
      return "You learn best through visual aids like diagrams, charts, and mind maps. Visual representations help you understand and remember information effectively."
    case 'auditory':
      return "You learn best through listening and verbal explanations. Discussions, lectures, and audio content are most effective for you."
    case 'kinesthetic':
      return "You learn best through hands-on experience and practice. Physical activity and real-world application help you grasp concepts."
    case 'reading_writing':
      return "You learn best through reading and writing. Taking detailed notes and reviewing written materials are your strengths."
    case 'mixed':
      return "You're a balanced learner who benefits from multiple learning approaches. Combining different methods works best for you."
    default:
      return ""
  }
}

export function getModeRecommendation(mode: PreferredMode): string {
  switch (mode) {
    case 'flashcards':
      return "Flashcards are perfect for your learning style - quick, visual reinforcement of key concepts with structured repetition."
    case 'chat':
      return "Chat mode offers interactive, conversational learning that adapts to your pace and style."
    case 'podcast':
      return "Podcast mode (coming soon) will be perfect for your auditory learning style, allowing you to learn on the go."
    case 'mindmap':
      return "Mind Map mode (coming soon) will help you visualize concept relationships and see the big picture."
    default:
      return "Try different modes to find what works best for you."
  }
}
