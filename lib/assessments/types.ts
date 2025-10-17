// Assessment Types and Interfaces

export interface AssessmentQuestion {
  id: number
  question: string
  category: 'vark' | 'intelligence' | 'environment' | 'social' | 'learning_cycle'
  options: AssessmentOption[]
}

export interface AssessmentOption {
  text: string
  scores: ScoreMap
}

export interface ScoreMap {
  // VARK Scores
  visual?: number
  auditory?: number
  kinesthetic?: number
  reading_writing?: number

  // Multiple Intelligences
  linguistic?: number
  logical_mathematical?: number
  spatial?: number
  bodily_kinesthetic?: number
  musical?: number
  interpersonal?: number
  intrapersonal?: number
  naturalistic?: number

  // Environmental Preferences
  quiet_environment?: number
  group_learning?: number
  frequent_breaks?: number
  background_music?: number
  structured_materials?: number
  flexible_approach?: number
}

export interface AssessmentResults {
  vark_scores: {
    visual: number
    auditory: number
    kinesthetic: number
    reading_writing: number
  }
  intelligence_scores?: {
    linguistic: number
    logical_mathematical: number
    spatial: number
    bodily_kinesthetic: number
    musical: number
    interpersonal: number
    intrapersonal: number
    naturalistic: number
  }
  environmental_preferences?: {
    quiet_environment: number
    group_learning: number
    frequent_breaks: number
    background_music: number
    structured_materials: number
    flexible_approach: number
  }
  dominant_style: string
  secondary_styles: string[]
}
