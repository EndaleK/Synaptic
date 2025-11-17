# Phase 3 Implementation Guide: Advanced Analytics & Remaining Features

**Date**: November 17, 2025
**Status**: Partially Complete (2 of 3 features implemented)
**Priority**: Medium (Core functionality working, these are enhancements)

---

## ✅ COMPLETED FEATURES

### 1. Error Toast Notifications ✅
**Status**: Implemented for ChatInterface and VideoView
**Impact**: Users now see friendly error messages when session tracking fails

**What Was Done**:
- Added `useToast` hook import to components
- Added error toast notifications for session start failures
- Added error toast notifications for connection issues

**Components Updated**:
- ✅ `components/ChatInterface.tsx` (lines 9, 85, 382, 386)
- ✅ `components/VideoView.tsx` (lines 13, 19, 56, 60)

**Remaining Work** (30 minutes per component):
Apply the same pattern to:
- ⏳ `components/WritingView.tsx`
- ⏳ `components/ExamView.tsx`
- ⏳ `components/PodcastView.tsx`
- ⏳ `components/MindMapView.tsx`
- ⏳ `components/FlashcardDisplay.tsx`

**Implementation Pattern**:
```typescript
// Step 1: Import useToast
import { useToast } from './ToastContainer'

// Step 2: Get toast instance
const toast = useToast()

// Step 3: Add error notifications
if (!response.ok) {
  console.error('[ComponentName] Failed to start study session:', response.status)
  toast.error('Unable to track study session. Your progress may not be recorded.')
} catch (error) {
  console.error('[ComponentName] Failed to start study session:', error)
  toast.error('Session tracking unavailable. Please check your connection.')
}
```

---

### 2. Loading Skeletons ✅
**Status**: Implemented for StudyStatistics page
**Impact**: Much better perceived performance, users see content structure immediately

**What Was Done**:
- Replaced simple spinner with comprehensive skeleton UI
- Added skeletons for:
  - Header with time range selector
  - Streak cards (2 cards)
  - Mode breakdown (pie chart + mode list)
  - Activity heatmap grid
- All skeletons match actual content structure
- Smooth pulsing animation

**File**: `components/StudyScheduler/StudyStatistics.tsx` (lines 291-362)

**Result**: Users see a structured, animated placeholder that matches the final UI layout

---

## ⏳ PENDING FEATURES

### 3. Time of Day Analysis
**Status**: Not Started
**Estimated Time**: 4-6 hours
**Complexity**: Medium (Backend + Frontend)
**Priority**: Medium

**What It Does**:
Analyzes when users study most effectively and shows:
- Peak productivity hours (morning/afternoon/evening/night)
- Study time distribution chart by hour
- Personalized recommendations ("You study best at 2-5 PM")

**Implementation Steps**:

#### A. Backend Changes (2-3 hours)

**Step 1: Update Database Schema**
Add time bucket tracking to study_sessions:

```sql
-- Migration file: supabase/migrations/YYYYMMDD_add_time_buckets.sql
ALTER TABLE study_sessions
ADD COLUMN time_bucket TEXT CHECK (time_bucket IN ('morning', 'afternoon', 'evening', 'night'));

-- Function to calculate time bucket from timestamp
CREATE OR REPLACE FUNCTION calculate_time_bucket(session_time TIMESTAMP WITH TIME ZONE)
RETURNS TEXT AS $$
DECLARE
  hour_of_day INT;
BEGIN
  hour_of_day := EXTRACT(HOUR FROM session_time);

  IF hour_of_day >= 6 AND hour_of_day < 12 THEN
    RETURN 'morning';
  ELSIF hour_of_day >= 12 AND hour_of_day < 17 THEN
    RETURN 'afternoon';
  ELSIF hour_of_day >= 17 AND hour_of_day < 21 THEN
    RETURN 'evening';
  ELSE
    RETURN 'night';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically set time_bucket on insert/update
CREATE OR REPLACE FUNCTION set_time_bucket()
RETURNS TRIGGER AS $$
BEGIN
  NEW.time_bucket := calculate_time_bucket(NEW.start_time);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_sessions_set_time_bucket
  BEFORE INSERT OR UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_time_bucket();
```

**Step 2: Update API Endpoint**
File: `app/api/study-statistics/route.ts`

Add time of day analysis to response:

```typescript
// Around line 365 (after mode breakdown calculation)

// Calculate time of day distribution
const timeOfDayData = {
  morning: { minutes: 0, sessions: 0 },
  afternoon: { minutes: 0, sessions: 0 },
  evening: { minutes: 0, sessions: 0 },
  night: { minutes: 0, sessions: 0 }
}

sessions.forEach(session => {
  const bucket = session.time_bucket || calculate_time_bucket(session.start_time)
  if (bucket && timeOfDayData[bucket as keyof typeof timeOfDayData]) {
    timeOfDayData[bucket as keyof typeof timeOfDayData].minutes += session.duration_minutes || 0
    timeOfDayData[bucket as keyof typeof timeOfDayData].sessions += 1
  }
})

// Find peak productivity time
const peakTime = Object.entries(timeOfDayData)
  .sort((a, b) => b[1].minutes - a[1].minutes)[0]

// Calculate hourly distribution (for detailed chart)
const hourlyData: Record<number, number> = {}
for (let hour = 0; hour < 24; hour++) {
  hourlyData[hour] = 0
}

sessions.forEach(session => {
  const hour = new Date(session.start_time).getHours()
  hourlyData[hour] += session.duration_minutes || 0
})

// Add to response
return NextResponse.json({
  stats: {
    ...existingStats,
    timeOfDay: timeOfDayData,
    peakProductivityTime: peakTime[0],
    peakProductivityMinutes: peakTime[1].minutes,
    hourlyDistribution: hourlyData
  }
})
```

Helper function to add:
```typescript
function calculate_time_bucket(timestamp: string | Date): string {
  const hour = new Date(timestamp).getHours()

  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}
```

#### B. Frontend Changes (2-3 hours)

**Step 1: Update TypeScript Interface**
File: `components/StudyScheduler/StudyStatistics.tsx`

```typescript
interface StudyStats {
  // ... existing fields ...

  // Time of Day Analysis
  timeOfDay?: {
    morning: { minutes: number; sessions: number }
    afternoon: { minutes: number; sessions: number }
    evening: { minutes: number; sessions: number }
    night: { minutes: number; sessions: number }
  }
  peakProductivityTime?: string
  peakProductivityMinutes?: number
  hourlyDistribution?: Record<number, number>
}
```

**Step 2: Add Time of Day Visualization**
After the mode breakdown section, add:

```tsx
{/* Time of Day Analysis */}
{stats.timeOfDay && (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
        <Clock className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Peak Productivity Time
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          When you study most effectively
        </p>
      </div>
    </div>

    {/* Peak Time Badge */}
    {stats.peakProductivityTime && (
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your best time is</p>
            <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-pink-600 capitalize">
              {stats.peakProductivityTime} ({getTimeRange(stats.peakProductivityTime)})
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.peakProductivityMinutes} min
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Time Distribution Bar Chart */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(stats.timeOfDay).map(([period, data]) => {
        const total = Object.values(stats.timeOfDay!).reduce((sum, d) => sum + d.minutes, 0)
        const percentage = total > 0 ? Math.round((data.minutes / total) * 100) : 0
        const isPeak = period === stats.peakProductivityTime

        return (
          <div
            key={period}
            className={`p-4 rounded-xl border-2 transition-all ${
              isPeak
                ? 'bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/30 dark:to-pink-900/30 border-orange-300 dark:border-orange-700'
                : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getTimeEmoji(period)}</span>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{period}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.minutes} min
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {data.sessions} sessions • {percentage}%
            </p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>

    {/* Hourly Heatmap (24-hour detailed view) */}
    {stats.hourlyDistribution && (
      <div className="mt-6">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Study Time by Hour
        </p>
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 24 }).map((_, hour) => {
            const minutes = stats.hourlyDistribution![hour] || 0
            const maxMinutes = Math.max(...Object.values(stats.hourlyDistribution!))
            const intensity = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0

            return (
              <div
                key={hour}
                className="group relative"
                title={`${hour}:00 - ${minutes} minutes`}
              >
                <div
                  className={`aspect-square rounded transition-all ${
                    intensity === 0
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : intensity < 25
                      ? 'bg-orange-200 dark:bg-orange-900/40'
                      : intensity < 50
                      ? 'bg-orange-300 dark:bg-orange-800/60'
                      : intensity < 75
                      ? 'bg-orange-400 dark:bg-orange-700/80'
                      : 'bg-orange-500 dark:bg-orange-600'
                  } hover:scale-110 hover:z-10`}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {hour}:00 - {minutes}min
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>
    )}
  </div>
)}
```

**Step 3: Add Helper Functions**

```typescript
function getTimeRange(period: string): string {
  switch (period) {
    case 'morning': return '6 AM - 12 PM'
    case 'afternoon': return '12 PM - 5 PM'
    case 'evening': return '5 PM - 9 PM'
    case 'night': return '9 PM - 6 AM'
    default: return ''
  }
}

function getTimeEmoji(period: string): string {
  switch (period) {
    case 'morning': return '🌅'
    case 'afternoon': return '☀️'
    case 'evening': return '🌆'
    case 'night': return '🌙'
    default: return '⏰'
  }
}
```

---

### 4. Study Recommendations (AI-Powered)
**Status**: Not Started
**Estimated Time**: 6-8 hours
**Complexity**: High (AI Integration + Backend + Frontend)
**Priority**: Low (Nice to have)

**What It Does**:
Provides personalized study recommendations based on:
- Usage patterns (which modes user prefers)
- Time since last use of each mode
- Effectiveness metrics (accuracy, completion rates)
- Learning style preferences
- Current streak status

**Examples**:
- "You haven't used flashcards in 3 days. Review helps retention!"
- "Great job with video learning! Try writing summaries to reinforce concepts."
- "Your chat sessions are productive. Consider taking an exam to test your knowledge."
- "You're on a 7-day streak! Study for 15 more minutes to maintain it."

**Implementation Steps**:

#### A. Backend AI Logic (3-4 hours)

**Step 1: Create Recommendation Engine**
File: `lib/recommendations/study-recommender.ts`

```typescript
interface UserStudyPattern {
  modeUsage: Record<string, { count: number; totalMinutes: number; lastUsed: Date | null }>
  currentStreak: number
  averageAccuracy: number
  weakModes: string[]
  strongModes: string[]
}

interface Recommendation {
  id: string
  type: 'encouragement' | 'suggestion' | 'reminder' | 'streak'
  title: string
  message: string
  action?: {
    label: string
    mode: string
  }
  priority: 'low' | 'medium' | 'high'
  icon: string
}

export function generateStudyRecommendations(
  stats: StudyStats,
  userPreferences?: LearningProfile
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // 1. Streak Maintenance
  if (stats.currentStreak > 0) {
    const minutesToday = stats.todayMinutes
    const dailyGoal = stats.dailyGoalMinutes || 30

    if (minutesToday === 0) {
      recommendations.push({
        id: 'streak-reminder',
        type: 'streak',
        title: `Don't Break Your ${stats.currentStreak}-Day Streak!`,
        message: `You're on fire! 🔥 Study for just ${dailyGoal} minutes today to keep it going.`,
        action: { label: 'Start Studying', mode: 'flashcards' },
        priority: 'high',
        icon: '🔥'
      })
    } else if (minutesToday < dailyGoal) {
      const remaining = dailyGoal - minutesToday
      recommendations.push({
        id: 'streak-progress',
        type: 'encouragement',
        title: 'Almost There!',
        message: `Study for ${remaining} more minutes to complete today's goal and maintain your ${stats.currentStreak}-day streak.`,
        priority: 'medium',
        icon: '💪'
      })
    }
  }

  // 2. Mode Diversity Recommendations
  const modeUsage = stats.modeBreakdown || {}
  const unusedModes = Object.entries(MODE_CONFIG)
    .filter(([key]) => !modeUsage[key as keyof typeof modeUsage] || modeUsage[key as keyof typeof modeUsage] === 0)
    .map(([key, config]) => ({ key, ...config }))

  if (unusedModes.length > 0 && stats.totalSessions > 5) {
    const suggestedMode = unusedModes[0]
    recommendations.push({
      id: 'try-new-mode',
      type: 'suggestion',
      title: `Try ${suggestedMode.name}!`,
      message: `You've been using ${Object.keys(modeUsage).length} modes. ${suggestedMode.name} could help reinforce your learning in a new way.`,
      action: { label: `Try ${suggestedMode.name}`, mode: suggestedMode.key },
      priority: 'low',
      icon: suggestedMode.icon
    })
  }

  // 3. Review Reminder (Spaced Repetition)
  if (stats.flashcardsReviewedWeek === 0 && stats.totalCardsCreated > 0) {
    recommendations.push({
      id: 'review-flashcards',
      type: 'reminder',
      title: 'Time to Review!',
      message: `You have ${stats.totalCardsCreated} flashcards waiting. Regular review improves long-term retention by 40%.`,
      action: { label: 'Review Now', mode: 'flashcards' },
      priority: 'high',
      icon: '🃏'
    })
  }

  // 4. Balanced Learning Recommendation
  const topMode = Object.entries(modeUsage)
    .sort((a, b) => b[1] - a[1])[0]

  if (topMode && topMode[1] > stats.totalMinutes * 0.7) {
    const complementaryMode = getComplementaryMode(topMode[0])
    recommendations.push({
      id: 'balance-learning',
      type: 'suggestion',
      title: 'Mix Up Your Learning',
      message: `You're focusing heavily on ${MODE_CONFIG[topMode[0] as keyof typeof MODE_CONFIG].name}. Try ${complementaryMode.name} to reinforce concepts differently.`,
      action: { label: `Try ${complementaryMode.name}`, mode: complementaryMode.key },
      priority: 'medium',
      icon: '🎯'
    })
  }

  // 5. Peak Productivity Time Reminder
  if (stats.peakProductivityTime) {
    const currentHour = new Date().getHours()
    const isPeakTime = isInPeakPeriod(currentHour, stats.peakProductivityTime)

    if (isPeakTime && stats.todayMinutes < stats.dailyGoalMinutes) {
      recommendations.push({
        id: 'peak-time',
        type: 'suggestion',
        title: 'Peak Performance Time!',
        message: `You're most productive during ${stats.peakProductivityTime}. Now's a great time to study!`,
        priority: 'medium',
        icon: '⚡'
      })
    }
  }

  // 6. Achievement Celebrations
  if (stats.currentStreak === 7 || stats.currentStreak === 30 || stats.currentStreak === 100) {
    recommendations.push({
      id: 'achievement',
      type: 'encouragement',
      title: `${stats.currentStreak}-Day Streak! 🎉`,
      message: `Amazing! You've studied consistently for ${stats.currentStreak} days. Keep up the incredible work!`,
      priority: 'high',
      icon: '🏆'
    })
  }

  // Sort by priority
  return recommendations.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 }
    return priority[b.priority] - priority[a.priority]
  })
}

function getComplementaryMode(mode: string): { key: string; name: string; icon: string } {
  const complementary: Record<string, string> = {
    flashcards: 'writing',
    chat: 'exam',
    video: 'writing',
    podcast: 'mindmap',
    writing: 'chat',
    mindmap: 'flashcards',
    exam: 'video'
  }

  const complementaryKey = complementary[mode] || 'flashcards'
  return {
    key: complementaryKey,
    ...MODE_CONFIG[complementaryKey as keyof typeof MODE_CONFIG]
  }
}

function isInPeakPeriod(currentHour: number, peakPeriod: string): boolean {
  switch (peakPeriod) {
    case 'morning': return currentHour >= 6 && currentHour < 12
    case 'afternoon': return currentHour >= 12 && currentHour < 17
    case 'evening': return currentHour >= 17 && currentHour < 21
    case 'night': return currentHour >= 21 || currentHour < 6
    default: return false
  }
}
```

**Step 2: Add to API Endpoint**
File: `app/api/study-statistics/route.ts`

```typescript
import { generateStudyRecommendations } from '@/lib/recommendations/study-recommender'

// ... in the route handler ...

const recommendations = generateStudyRecommendations(stats, userPreferences)

return NextResponse.json({
  stats: {
    ...existingStats,
    recommendations
  }
})
```

#### B. Frontend Display (2-3 hours)

**Step 1: Update TypeScript Interface**

```typescript
interface StudyStats {
  // ... existing fields ...

  recommendations?: Array<{
    id: string
    type: 'encouragement' | 'suggestion' | 'reminder' | 'streak'
    title: string
    message: string
    action?: { label: string; mode: string }
    priority: 'low' | 'medium' | 'high'
    icon: string
  }>
}
```

**Step 2: Add Recommendations Section**
After the AI Insights section, add:

```tsx
{/* Study Recommendations */}
{stats.recommendations && stats.recommendations.length > 0 && (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Personalized Recommendations
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          AI-powered suggestions to enhance your learning
        </p>
      </div>
    </div>

    <div className="space-y-3">
      {stats.recommendations.slice(0, 5).map((rec) => (
        <div
          key={rec.id}
          className={`p-4 rounded-xl border-2 transition-all ${
            rec.priority === 'high'
              ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-700'
              : rec.priority === 'medium'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{rec.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {rec.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {rec.message}
              </p>
              {rec.action && (
                <button
                  onClick={() => {
                    // Navigate to the recommended mode
                    window.location.href = `/dashboard?mode=${rec.action!.mode}`
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {rec.action.label}
                </button>
              )}
            </div>
            {rec.priority === 'high' && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded">
                Important
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 📊 IMPLEMENTATION PRIORITY

Based on impact and complexity:

1. **Complete Error Toast Notifications** (2 hours) - **DO THIS FIRST**
   - Easy to implement (just copy pattern to 5 more components)
   - High user value (better error communication)
   - Low risk

2. **Time of Day Analysis** (4-6 hours) - **DO THIS SECOND**
   - Medium complexity but very visual
   - Provides unique insights users can't get elsewhere
   - Helps users optimize study times

3. **Study Recommendations** (6-8 hours) - **DO THIS LAST**
   - Highest complexity (AI logic + multiple systems)
   - Most impressive feature but not essential
   - Can be refined over time with user feedback

---

## 🚀 QUICK START

To complete remaining error toast notifications:

1. Open each component file
2. Add import: `import { useToast } from './ToastContainer'`
3. Add hook: `const toast = useToast()`
4. Find session tracking error handlers (search for `console.error`)
5. Add toast notifications: `toast.error('message')`
6. Test in browser console

**Estimated total time to finish all error toasts**: 2 hours

---

## ✅ TESTING CHECKLIST

When implementing features:

**Error Toast Notifications**:
- [ ] Toast appears on session start failure
- [ ] Toast appears on network error
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Toast can be manually dismissed with X button
- [ ] Multiple toasts stack properly
- [ ] Dark mode colors work correctly

**Time of Day Analysis**:
- [ ] Time buckets calculate correctly across timezones
- [ ] Peak time displays correctly
- [ ] Hourly heatmap shows accurate data
- [ ] Time period cards show correct percentages
- [ ] Empty state handles no data gracefully

**Study Recommendations**:
- [ ] Recommendations appear based on actual patterns
- [ ] CTA buttons navigate to correct modes
- [ ] Priority sorting works (high → medium → low)
- [ ] At most 5 recommendations shown
- [ ] Recommendations update when stats change

---

**Last Updated**: November 17, 2025
**Maintained By**: Development Team
**Questions?**: See STUDY-STATISTICS-ENHANCEMENT-SUMMARY.md for Phase 1 & 2 details
