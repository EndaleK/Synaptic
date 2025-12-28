# Implementation Guide: Personalization Engine

Integration patterns for adding personalization to Synaptic features.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interactions                       │
│  (Flashcards, Chat, Quizzes, Podcasts, Mind Maps, etc.)    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event Collection Layer                    │
│  Track: accuracy, timing, format usage, engagement signals  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Profile Update Engine                      │
│  Aggregate events → Update user profile → Save to Supabase  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Recommendation Engine                       │
│  Read profile → Generate recommendations → Apply to UX      │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Flashcard Review

**File**: `components/FlashcardDisplay.tsx`

**Events to Track**:
```typescript
interface FlashcardReviewEvent {
  type: 'flashcard_review'
  card_id: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  response_time_ms: number
  rating: 0 | 1 | 2 | 3  // Again, Hard, Good, Easy
  was_correct: boolean
  attempt_number: number
}
```

**Where to Emit**:
```typescript
// In handleRating function after updating SM-2
await trackPersonalizationEvent({
  type: 'flashcard_review',
  card_id: flashcard.id,
  topic: flashcard.topic || document.title,
  difficulty: flashcard.difficulty,
  response_time_ms: Date.now() - cardShownAt,
  rating: selectedRating,
  was_correct: selectedRating >= 2,
  attempt_number: flashcard.repetitions + 1
})
```

**Profile Updates**:
- Update `performance.accuracy_by_difficulty`
- Update `performance.response_time`
- Update `retention_patterns` based on interval
- Track `error_analysis.common_mistakes` if wrong

---

### 2. Quiz Completion

**File**: `components/QuizView.tsx` (or similar)

**Events to Track**:
```typescript
interface QuizCompleteEvent {
  type: 'quiz_complete'
  quiz_id: string
  topic: string
  total_questions: number
  correct_answers: number
  accuracy: number
  time_taken_seconds: number
  question_types: Record<string, { attempted: number; correct: number }>
  difficulty_level: string
}
```

**Profile Updates**:
- Update `knowledge.subjects[topic].mastery_percentage`
- Update `performance.accuracy_by_question_type`
- Identify `knowledge.weak_areas` from wrong answers
- Update `study_habits.self_testing` frequency

---

### 3. Content Format Selection

**File**: `app/dashboard/page.tsx`

**Events to Track**:
```typescript
interface FormatSelectionEvent {
  type: 'format_selected'
  format: 'flashcards' | 'podcast' | 'mindmap' | 'chat' | 'quiz' | 'writing'
  document_id?: string
  topic?: string
  session_context: 'initial' | 'continuing' | 'switching'
}
```

**Where to Emit**: When user clicks mode tiles in DashboardHome or switches modes.

**Profile Updates**:
- Update `learning_style.format_engagement`
- Calculate `learning_style.primary_modality` from patterns

---

### 4. Podcast Listening

**File**: `components/PodcastView.tsx`

**Events to Track**:
```typescript
interface PodcastListenEvent {
  type: 'podcast_listen'
  podcast_id: string
  topic: string
  total_duration_seconds: number
  listened_duration_seconds: number
  completion_rate: number
  paused_at: number[]  // Timestamps where paused
  replayed_sections: Array<{ start: number; end: number }>
  playback_speed: number
}
```

**Profile Updates**:
- Update `learning_style.modality_scores.auditory`
- Track `engagement.attention_span` from pause patterns
- Update `content_preferences` based on topics completed

---

### 5. Mind Map Interaction

**File**: `components/MindMapViewer.tsx`

**Events to Track**:
```typescript
interface MindMapInteractionEvent {
  type: 'mindmap_interaction'
  mindmap_id: string
  topic: string
  view_duration_seconds: number
  nodes_expanded: number
  nodes_clicked: string[]
  zoom_level_changes: number
  exported: boolean
}
```

**Profile Updates**:
- Update `learning_style.modality_scores.visual`
- Track exploration patterns for `engagement.curiosity_driven`

---

### 6. Chat Interaction

**File**: `components/ChatInterface.tsx`

**Events to Track**:
```typescript
interface ChatInteractionEvent {
  type: 'chat_interaction'
  document_id: string
  message_count: number
  question_types: ('clarification' | 'explanation' | 'example' | 'application')[]
  avg_response_satisfaction: number  // Based on follow-ups
  session_duration_seconds: number
  topics_discussed: string[]
}
```

**Profile Updates**:
- Update `communication.interaction_style.prefers_dialogue`
- Track `communication.question_comfort`
- Update `content_preferences` based on question patterns

---

### 7. Session Tracking

**File**: `lib/store/useStore.ts` or new `lib/personalization/session-tracker.ts`

**Events to Track**:
```typescript
interface SessionEvent {
  type: 'session_start' | 'session_end' | 'session_pause'
  session_id: string
  timestamp: string
  activities_completed: string[]
  total_duration_minutes: number
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night'
  day_of_week: string
}
```

**Profile Updates**:
- Update `study_habits.session_patterns`
- Update `temporal.productive_times`
- Update `temporal.weekly_pattern`

---

## Zustand Store Integration

Add personalization state to existing stores or create new:

```typescript
// lib/store/usePersonalizationStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PersonalizationState {
  // Cached profile for quick access
  profile: UserPersonalizationProfile | null
  lastUpdated: string | null

  // Pending events to batch send
  pendingEvents: PersonalizationEvent[]

  // Actions
  setProfile: (profile: UserPersonalizationProfile) => void
  addEvent: (event: PersonalizationEvent) => void
  flushEvents: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set, get) => ({
      profile: null,
      lastUpdated: null,
      pendingEvents: [],

      setProfile: (profile) => set({ profile, lastUpdated: new Date().toISOString() }),

      addEvent: (event) => set((state) => ({
        pendingEvents: [...state.pendingEvents, event]
      })),

      flushEvents: async () => {
        const events = get().pendingEvents
        if (events.length === 0) return

        try {
          await fetch('/api/personalization/events', {
            method: 'POST',
            body: JSON.stringify({ events })
          })
          set({ pendingEvents: [] })
        } catch (error) {
          console.error('Failed to flush personalization events:', error)
        }
      },

      refreshProfile: async () => {
        const response = await fetch('/api/personalization/profile')
        const profile = await response.json()
        set({ profile, lastUpdated: new Date().toISOString() })
      }
    }),
    {
      name: 'personalization-storage',
      partialize: (state) => ({
        profile: state.profile,
        lastUpdated: state.lastUpdated,
        // Don't persist pending events to avoid duplicates
      })
    }
  )
)
```

---

## API Routes

### GET `/api/personalization/profile`

Returns the user's complete personalization profile.

```typescript
// app/api/personalization/profile/route.ts
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_personalization')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // Not "not found"
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Return default profile if none exists
  return Response.json(data || getDefaultProfile(userId))
}
```

### POST `/api/personalization/events`

Batch receives events and updates profile.

```typescript
// app/api/personalization/events/route.ts
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { events } = await req.json()

  // Store events
  const supabase = createClient()
  await supabase.from('personalization_events').insert(
    events.map((e: any) => ({
      user_id: userId,
      event_type: e.type,
      event_data: e
    }))
  )

  // Update profile based on new events
  await updateProfileFromEvents(userId, events)

  return Response.json({ success: true })
}
```

### GET `/api/personalization/recommendations`

Returns personalized recommendations.

```typescript
// app/api/personalization/recommendations/route.ts
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const profile = await getProfile(userId)
  const recommendations = generateRecommendations(profile, {
    currentTime: new Date(),
    upcomingExams: await getUpcomingExams(userId),
    recentActivity: await getRecentActivity(userId)
  })

  return Response.json(recommendations)
}
```

---

## Profile Update Functions

```typescript
// lib/personalization/profile-updater.ts

export async function updateProfileFromEvents(
  userId: string,
  events: PersonalizationEvent[]
) {
  const profile = await getProfile(userId)

  for (const event of events) {
    switch (event.type) {
      case 'flashcard_review':
        updateFromFlashcardReview(profile, event)
        break
      case 'quiz_complete':
        updateFromQuizComplete(profile, event)
        break
      case 'format_selected':
        updateFromFormatSelection(profile, event)
        break
      // ... other event types
    }
  }

  await saveProfile(userId, profile)
}

function updateFromFlashcardReview(
  profile: UserPersonalizationProfile,
  event: FlashcardReviewEvent
) {
  // Update accuracy metrics
  const accuracy = event.was_correct ? 1 : 0
  const difficultyKey = event.difficulty

  profile.performance.accuracy_by_difficulty[difficultyKey] =
    calculateRunningAverage(
      profile.performance.accuracy_by_difficulty[difficultyKey],
      accuracy,
      0.1 // Learning rate
    )

  // Update response time
  profile.performance.response_time.average_per_question =
    calculateRunningAverage(
      profile.performance.response_time.average_per_question * 1000,
      event.response_time_ms,
      0.05
    ) / 1000

  // Update format engagement
  profile.learning_style.format_engagement.flashcards =
    Math.min(1, profile.learning_style.format_engagement.flashcards + 0.01)

  // Decay other formats slightly
  for (const format of ['podcasts', 'mind_maps', 'quizzes']) {
    profile.learning_style.format_engagement[format] *= 0.999
  }
}

function calculateRunningAverage(
  current: number,
  newValue: number,
  learningRate: number
): number {
  return current * (1 - learningRate) + newValue * learningRate
}
```

---

## Recommendation Generator

```typescript
// lib/personalization/recommendations.ts

export function generateRecommendations(
  profile: UserPersonalizationProfile,
  context: RecommendationContext
): PersonalizedRecommendations {
  const recommendations: PersonalizedRecommendations = {
    study_plan: null,
    content_format: [],
    difficulty_level: 'maintain',
    timing: 'now',
    focus_areas: [],
    strategies: []
  }

  // Format recommendations based on learning style
  const formats = Object.entries(profile.learning_style.format_engagement)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([format]) => format)

  recommendations.content_format = formats

  // Difficulty based on performance
  if (profile.performance.overall_accuracy > 0.85) {
    recommendations.difficulty_level = 'increase'
    recommendations.strategies.push('Challenge yourself with harder material')
  } else if (profile.performance.overall_accuracy < 0.60) {
    recommendations.difficulty_level = 'decrease'
    recommendations.strategies.push('Review fundamentals before advancing')
  }

  // Timing based on productive periods
  const currentHour = context.currentTime.getHours()
  const isProductiveTime = profile.temporal.productive_times.some(pt => {
    const [start, end] = pt.time.split('-').map(t => parseInt(t))
    return currentHour >= start && currentHour < end
  })

  if (isProductiveTime) {
    recommendations.timing = 'now'
    recommendations.strategies.push('Great time for challenging new material')
  } else {
    const nextPeak = findNextProductiveTime(profile, context.currentTime)
    recommendations.timing = nextPeak
    recommendations.strategies.push('Consider light review now, deep work later')
  }

  // Focus areas based on weak spots
  for (const subject of Object.keys(profile.knowledge.subjects)) {
    const subjectData = profile.knowledge.subjects[subject]
    for (const weakArea of subjectData.weak_areas) {
      recommendations.focus_areas.push({
        concept: weakArea,
        priority: 'high',
        suggested_practice: `Generate flashcards for ${weakArea}`
      })
    }
  }

  // Exam-aware recommendations
  for (const exam of context.upcomingExams) {
    if (exam.days_away <= 3) {
      recommendations.focus_areas.unshift({
        concept: exam.subject,
        priority: 'high',
        suggested_practice: `Review mode - ${exam.subject} exam in ${exam.days_away} days`
      })
    }
  }

  return recommendations
}
```

---

## UI Integration Examples

### Showing Personalized Recommendations

```tsx
// components/PersonalizedRecommendations.tsx
export function PersonalizedRecommendations() {
  const { data: recommendations } = useSWR('/api/personalization/recommendations')

  if (!recommendations) return null

  return (
    <div className="space-y-4">
      {recommendations.focus_areas.slice(0, 3).map((area, i) => (
        <div
          key={i}
          className={cn(
            "p-4 rounded-lg border",
            area.priority === 'high' && "border-orange-500 bg-orange-50"
          )}
        >
          <h4 className="font-medium">{area.concept}</h4>
          <p className="text-sm text-gray-600">{area.suggested_practice}</p>
        </div>
      ))}

      {recommendations.strategies.map((strategy, i) => (
        <p key={i} className="text-sm text-gray-500 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          {strategy}
        </p>
      ))}
    </div>
  )
}
```

### Adaptive Difficulty in Flashcards

```tsx
// In flashcard generation
const profile = await getProfile(userId)
const difficulty = profile.performance.optimal_difficulty

const flashcards = await generateFlashcards(document, {
  difficulty,
  // Adjust based on accuracy
  complexity: profile.performance.accuracy_by_difficulty[difficulty] > 0.8
    ? 'increase'
    : 'maintain'
})
```

---

## Event Batching Strategy

To avoid too many API calls, batch events:

```typescript
// lib/personalization/event-batcher.ts

class EventBatcher {
  private events: PersonalizationEvent[] = []
  private flushTimeout: NodeJS.Timeout | null = null

  add(event: PersonalizationEvent) {
    this.events.push(event)

    // Flush after 30 seconds of inactivity
    if (this.flushTimeout) clearTimeout(this.flushTimeout)
    this.flushTimeout = setTimeout(() => this.flush(), 30000)

    // Or flush if we have 10+ events
    if (this.events.length >= 10) {
      this.flush()
    }
  }

  async flush() {
    if (this.events.length === 0) return

    const toSend = [...this.events]
    this.events = []

    await fetch('/api/personalization/events', {
      method: 'POST',
      body: JSON.stringify({ events: toSend })
    })
  }

  // Call on page unload
  flushSync() {
    if (this.events.length === 0) return

    navigator.sendBeacon(
      '/api/personalization/events',
      JSON.stringify({ events: this.events })
    )
    this.events = []
  }
}

export const eventBatcher = new EventBatcher()

// In app layout
useEffect(() => {
  const handleUnload = () => eventBatcher.flushSync()
  window.addEventListener('beforeunload', handleUnload)
  return () => window.removeEventListener('beforeunload', handleUnload)
}, [])
```
