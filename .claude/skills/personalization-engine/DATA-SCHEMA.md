# Personalization Data Schema

TypeScript interfaces for user personalization data. Use these types when implementing personalization features.

---

## Core Profile Interface

```typescript
interface UserPersonalizationProfile {
  user_id: string
  created_at: string
  updated_at: string

  learning_style: LearningStyleProfile
  knowledge: KnowledgeProfile
  performance: PerformanceProfile
  study_habits: StudyHabitsProfile
  content_preferences: ContentPreferencesProfile
  engagement: EngagementProfile
  communication: CommunicationProfile
  temporal: TemporalProfile
}
```

---

## Dimension 1: Learning Style

```typescript
interface LearningStyleProfile {
  primary_modality: 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic'
  secondary_modality: 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic'

  modality_scores: {
    visual: number        // 0-1, engagement with mind maps, diagrams
    auditory: number      // 0-1, engagement with podcasts
    reading_writing: number // 0-1, engagement with flashcards, text
    kinesthetic: number   // 0-1, engagement with quizzes, practice
  }

  explanation_preferences: {
    analogies: number     // 0-1, response to analogies
    step_by_step: number  // 0-1, preference for procedural
    diagrams: number      // 0-1, visual explanation engagement
    abstract_theory: number // 0-1, theoretical depth tolerance
    examples: number      // 0-1, example frequency preference
  }

  format_engagement: {
    flashcards: number
    quizzes: number
    podcasts: number
    mind_maps: number
    study_guides: number
  }
}
```

---

## Dimension 2: Knowledge Level

```typescript
interface KnowledgeProfile {
  subjects: Record<string, SubjectProficiency>
  recent_performance: RecentPerformance
}

interface SubjectProficiency {
  overall_level: 'beginner' | 'intermediate' | 'advanced'
  mastery_percentage: number  // 0-100
  strong_areas: string[]
  weak_areas: string[]
  learning_velocity: 'slow' | 'moderate' | 'fast'
  needs_prerequisite_review?: string[]
  last_updated: string
}

interface RecentPerformance {
  average_accuracy: number      // 0-1
  optimal_difficulty: 'easy' | 'medium' | 'hard'
  challenge_tolerance: 'low' | 'moderate' | 'high'
  frustration_threshold: number // Accuracy below which frustration occurs
  boredom_threshold: number     // Accuracy above which boredom occurs
}
```

---

## Dimension 3: Performance Patterns

```typescript
interface PerformanceProfile {
  overall_accuracy: number

  accuracy_by_difficulty: {
    easy: number
    medium: number
    hard: number
  }

  accuracy_by_question_type: {
    multiple_choice: number
    free_response: number
    calculation: number
    conceptual: number
  }

  error_analysis: {
    careless_errors: number       // Percentage of errors
    conceptual_gaps: number
    time_pressure_errors: number
    common_mistakes: string[]     // Recurring error descriptions
  }

  retention_patterns: {
    immediate: number             // Same session
    after_24_hours: number
    after_1_week: number
    after_1_month: number
    fastest_decay: string[]       // Topics that fade quickly
    strongest_retention: string[] // Topics that stick
  }

  response_time: {
    average_per_question: number  // Seconds
    comfortable_pace: number
    rushed_pace: number           // Below this, accuracy drops
    overthinking_threshold: number // Above this, diminishing returns
    slow_areas: string[]
    fast_areas: string[]
  }
}
```

---

## Dimension 4: Study Habits

```typescript
interface StudyHabitsProfile {
  session_patterns: {
    frequency: string             // e.g., "5-6 days/week"
    average_duration: number      // Minutes
    preferred_times: string[]     // e.g., ["7-9 AM", "8-10 PM"]
    most_productive: string
    completion_rate: number       // 0-1

    weekly_pattern: Record<string, 'high' | 'medium' | 'low'>
  }

  engagement_style: {
    active_learning: number       // Ratio of active vs passive
    question_frequency: 'low' | 'moderate' | 'high'
    help_seeking: 'rare' | 'moderate' | 'frequent'
    self_testing: 'rare' | 'sometimes' | 'frequent'
    exploration: 'structured' | 'moderate' | 'exploratory'
  }

  procrastination_indicators: {
    cramming_tendency: 'rare' | 'moderate' | 'common'
    deadline_proximity_boost: number  // Productivity increase near deadlines
    early_prep_rate: number          // Percentage who start early
    last_minute_sessions: 'rare' | 'sometimes' | 'common'
  }

  effective_strategies: {
    uses_spaced_repetition: boolean
    self_explains: 'rarely' | 'sometimes' | 'frequently'
    practices_retrieval: 'rarely' | 'sometimes' | 'frequently'
    interleaves_topics: boolean
    uses_elaboration: 'rarely' | 'sometimes' | 'frequently'
  }
}
```

---

## Dimension 5: Content Preferences

```typescript
interface ContentPreferencesProfile {
  interests: {
    primary: string[]          // Most engaged topics
    secondary: string[]
    least_interested: string[]
  }

  example_preferences: {
    tech_analogies: number
    sports_examples: number
    gaming_references: number
    historical_context: number
    pop_culture: number
    nature_examples: number
    music_references: number
  }

  complexity_profile: {
    comfort_with_jargon: number   // 0-1
    theoretical_tolerance: number
    prefers_concrete: number
    depth_desired: 'surface' | 'moderate' | 'deep'
  }

  engagement_triggers: string[]  // Specific things that capture attention
}
```

---

## Dimension 6: Engagement

```typescript
interface EngagementProfile {
  attention_span: {
    average_focus_duration: number  // Minutes
    drop_off_indicators: string[]
    re_engagement_triggers: string[]
  }

  motivation_factors: {
    progress_visualization: number
    achievement_badges: number
    competitive_elements: number
    curiosity_driven: number
    social_comparison: number
    goal_achievement: number
  }

  feedback_preferences: {
    praise_importance: number
    criticism_tolerance: number
    detail_level: 'minimal' | 'moderate' | 'comprehensive'
    immediacy: 'instant' | 'delayed' | 'batched'
    format: 'text' | 'visual' | 'visual_and_text'
  }

  gamification_response: {
    streaks: number
    points: number
    levels: number
    badges: number
    leaderboards: number
  }
}
```

---

## Dimension 7: Communication Style

```typescript
interface CommunicationProfile {
  tone_preference: 'formal' | 'casual_friendly' | 'direct' | 'encouraging'
  formality_level: number  // 0=informal, 1=formal

  explanation_preferences: {
    length: 'brief' | 'moderate' | 'detailed'
    technical_detail: 'minimal' | 'medium' | 'high'
    examples_per_concept: number
    summary_preference: 'at_start' | 'at_end' | 'both' | 'none'
    repetition_tolerance: 'low' | 'moderate' | 'high'
  }

  feedback_tone: {
    encouragement_level: number
    directness: number
    humor_acceptance: number
    emoji_tolerance: number
  }

  interaction_style: {
    prefers_dialogue: boolean
    question_comfort: 'low' | 'moderate' | 'high'
    detail_requests: 'rare' | 'sometimes' | 'frequent'
    patience_level: 'low' | 'moderate' | 'high'
  }
}
```

---

## Dimension 8: Temporal Patterns

```typescript
interface TemporalProfile {
  productive_times: Array<{
    time: string           // e.g., "7-9 AM"
    productivity: number   // 0-1
  }>

  weekly_pattern: Record<string, {
    energy: 'low' | 'medium' | 'high'
    focus: 'poor' | 'fair' | 'good' | 'excellent'
  }>

  deadline_behavior: {
    advance_prep: 'rare' | 'sometimes' | 'usually'
    productivity_spike: string  // e.g., "3_days_before"
    cramming_tendency: 'low' | 'moderate' | 'high'
    stress_level_impact: number // 0-1
  }

  current_context: {
    exam_schedule: Array<{
      subject: string
      date: string
      days_away: number
    }>
    assignments_due: Array<{
      subject: string
      due: string
      urgency: 'low' | 'medium' | 'high'
    }>
    overall_stress: 'low' | 'moderate' | 'high'
  }
}
```

---

## Session Tracking Interface

```typescript
interface StudySession {
  session_id: string
  user_id: string
  timestamp: string
  duration: number  // Minutes

  activities: SessionActivity[]

  engagement_metrics: {
    focus_level: number
    completion_rate: number
    pause_count: number
    help_requests: number
  }

  context: {
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night'
    device: 'desktop' | 'tablet' | 'mobile'
    location_type?: 'home' | 'school' | 'library' | 'other'
  }
}

interface SessionActivity {
  type: 'flashcard_review' | 'quiz' | 'podcast' | 'mindmap' | 'chat' | 'writing'
  topic: string
  duration?: number

  // Type-specific metrics
  cards_reviewed?: number
  accuracy?: number
  avg_response_time?: number
  questions?: number
  score?: number
  listen_completion?: number
}
```

---

## Recommendations Interface

```typescript
interface PersonalizedRecommendations {
  study_plan: StudyPlanRecommendation | null
  content_format: string[]
  difficulty_level: 'maintain' | 'increase' | 'decrease'
  timing: 'now' | string  // Time suggestion
  focus_areas: FocusArea[]
  strategies: string[]
}

interface FocusArea {
  concept: string
  priority: 'low' | 'medium' | 'high'
  suggested_practice: string
}

interface StudyPlanRecommendation {
  recommended_duration: number
  suggested_activities: string[]
  break_intervals: number
  topics_to_cover: string[]
}
```

---

## Database Table Suggestion

For Supabase, consider this table structure:

```sql
CREATE TABLE user_personalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id),

  -- Store full profile as JSONB for flexibility
  learning_style JSONB DEFAULT '{}',
  knowledge JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  study_habits JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  engagement JSONB DEFAULT '{}',
  communication JSONB DEFAULT '{}',
  temporal JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Session tracking for continuous learning
CREATE TABLE personalization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id),
  event_type TEXT NOT NULL,  -- 'flashcard_review', 'quiz_complete', etc.
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personalization_events_user ON personalization_events(user_id);
CREATE INDEX idx_personalization_events_type ON personalization_events(event_type);
```
