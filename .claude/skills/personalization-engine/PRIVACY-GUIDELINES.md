# Privacy Guidelines for Personalization

Rules for ethical data collection and user transparency.

---

## Core Privacy Principles

1. **Collect Only What's Needed**: No data hoarding
2. **Be Transparent**: Users know what's tracked
3. **Provide Control**: Users can view, export, delete
4. **Secure Storage**: Protect all personal data
5. **No Dark Patterns**: Never manipulate users

---

## What We Track

### Explicitly Tracked (Visible to Users)

| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Study session timing | Recommend optimal study times | 90 days |
| Format engagement | Suggest preferred content types | 90 days |
| Accuracy metrics | Adjust difficulty levels | 90 days |
| Topic performance | Identify weak areas | 90 days |
| Review intervals | Optimize spaced repetition | Indefinite |

### Implicitly Tracked (Background Metrics)

| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Response times | Calibrate pacing | 30 days |
| Pause patterns | Detect confusion points | 7 days |
| Session completion | Optimize session length | 30 days |

### Never Tracked

- Exact keystrokes or mouse movements
- Screen recordings
- Location data beyond timezone
- Audio/video from device
- Data from other apps
- Personal communications
- Financial information (beyond subscription status)

---

## User Consent Requirements

### First-Time User Flow

```tsx
// Show on first login to dashboard
<PersonalizationConsent>
  <h2>Help Us Personalize Your Learning</h2>

  <p>
    Synaptic learns from your study patterns to provide better recommendations.
    We track:
  </p>

  <ul>
    <li>What you study and when</li>
    <li>Your performance and progress</li>
    <li>Which formats you prefer</li>
  </ul>

  <p>
    All data stays private and is used only to improve your experience.
  </p>

  <Button onClick={enablePersonalization}>
    Enable Personalization
  </Button>

  <Button variant="ghost" onClick={skipPersonalization}>
    Study Without Personalization
  </Button>
</PersonalizationConsent>
```

### Settings Toggle

```tsx
// In user settings
<SettingsSection title="Personalization">
  <Toggle
    label="Enable personalized recommendations"
    description="Track study patterns to improve suggestions"
    checked={settings.personalizationEnabled}
    onChange={togglePersonalization}
  />

  <Toggle
    label="Adapt difficulty automatically"
    description="Adjust content difficulty based on performance"
    checked={settings.adaptiveDifficulty}
    onChange={toggleAdaptiveDifficulty}
  />

  <Toggle
    label="Track study habits"
    description="Record session timing for schedule recommendations"
    checked={settings.trackHabits}
    onChange={toggleHabitTracking}
  />
</SettingsSection>
```

---

## Data Access & Export

### View My Data

Users can view all collected data:

```tsx
// Settings → Privacy → View My Data
<DataViewer>
  <Section title="Learning Style">
    <DataPoint label="Primary modality" value={profile.learning_style.primary_modality} />
    <DataPoint label="Format preferences" value={formatEngagementChart} />
  </Section>

  <Section title="Performance">
    <DataPoint label="Overall accuracy" value={`${(profile.performance.overall_accuracy * 100).toFixed(1)}%`} />
    <DataPoint label="Common challenges" value={profile.performance.error_analysis.common_mistakes} />
  </Section>

  <Section title="Study Patterns">
    <DataPoint label="Most productive time" value={profile.study_habits.session_patterns.most_productive} />
    <DataPoint label="Average session" value={`${profile.study_habits.session_patterns.average_duration} min`} />
  </Section>
</DataViewer>
```

### Export Data

```typescript
// API: GET /api/personalization/export
export async function GET(req: NextRequest) {
  const { userId } = await auth()

  const profile = await getFullProfile(userId)
  const events = await getAllEvents(userId)

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    events,
    usage_summary: generateUsageSummary(events)
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="synaptic-data-${userId}.json"`
    }
  })
}
```

### Delete Data

```typescript
// API: DELETE /api/personalization
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()

  // Delete all personalization data
  await supabase.from('user_personalization').delete().eq('user_id', userId)
  await supabase.from('personalization_events').delete().eq('user_id', userId)

  // Reset to default profile
  await supabase.from('user_personalization').insert({
    user_id: userId,
    ...getDefaultProfile(userId)
  })

  return Response.json({
    success: true,
    message: 'All personalization data deleted. Default preferences restored.'
  })
}
```

---

## Data Security

### Storage Requirements

```typescript
// All personalization data stored with:
{
  // User isolation via RLS
  user_id: 'clerk_user_id',

  // No PII in event data
  event_data: {
    type: 'flashcard_review',
    accuracy: 0.85,
    // NO: card content, personal notes, etc.
  },

  // Timestamps for retention enforcement
  created_at: 'timestamp'
}
```

### RLS Policies

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own personalization"
  ON user_personalization FOR SELECT
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update own personalization"
  ON user_personalization FOR UPDATE
  USING (user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete own personalization"
  ON user_personalization FOR DELETE
  USING (user_id = auth.jwt()->>'sub');
```

### Data Retention

```typescript
// Cron job: Clean old events
// Run daily at 3 AM

async function cleanOldEvents() {
  const supabase = createClient()

  // Delete events older than 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  await supabase
    .from('personalization_events')
    .delete()
    .lt('created_at', cutoff.toISOString())

  console.log(`Cleaned events older than ${cutoff.toISOString()}`)
}
```

---

## Transparency in Recommendations

### Show Why

Always explain personalization decisions:

```tsx
// Good: Transparent recommendation
<RecommendationCard>
  <h3>Try Audio Summaries</h3>
  <p>Based on your 85% podcast completion rate, you might enjoy audio formats.</p>
  <Badge>Based on your activity</Badge>
</RecommendationCard>

// Bad: Opaque recommendation
<RecommendationCard>
  <h3>Try Audio Summaries</h3>
  <p>We think you'll like this.</p>
</RecommendationCard>
```

### Explanation Patterns

```typescript
const explanations = {
  difficulty_increase: (accuracy: number) =>
    `Your ${(accuracy * 100).toFixed(0)}% accuracy suggests you're ready for more challenge.`,

  format_suggestion: (format: string, engagement: number) =>
    `You engage ${(engagement * 100).toFixed(0)}% more with ${format} content.`,

  timing_suggestion: (time: string, productivity: number) =>
    `You're ${(productivity * 100).toFixed(0)}% more productive during ${time}.`,

  focus_area: (topic: string, accuracy: number) =>
    `Your ${topic} accuracy (${(accuracy * 100).toFixed(0)}%) could improve with focused practice.`
}
```

---

## User Control Patterns

### Override Recommendations

```tsx
// Allow users to dismiss or adjust recommendations
<Recommendation
  title="Practice Calculus"
  reason="Based on recent quiz performance"
  onDismiss={() => dismissRecommendation('calculus-practice')}
  onFeedback={(rating) => rateRecommendation('calculus-practice', rating)}
>
  <OverrideButton onClick={() => showOverrideOptions()}>
    This doesn't apply to me
  </OverrideButton>
</Recommendation>
```

### Manual Preferences

```tsx
// Let users explicitly set preferences
<PreferencesForm>
  <Select
    label="I learn best with..."
    options={['Visual materials', 'Audio content', 'Reading', 'Practice problems']}
    value={manualPreference}
    onChange={setManualPreference}
  />

  <p className="text-sm text-gray-500">
    Your manual preference will override detected patterns.
  </p>
</PreferencesForm>
```

---

## Anti-Patterns to Avoid

### Never Do

1. **Hidden tracking without consent**
   ```typescript
   // BAD: Tracking without user knowing
   trackEvent({ type: 'page_view', page: window.location.href })
   ```

2. **Manipulative recommendations**
   ```typescript
   // BAD: Designed to increase usage, not help learning
   if (user.streakDays < 3) {
     showUrgentNotification("You're falling behind!")
   }
   ```

3. **Sharing personal data**
   ```typescript
   // BAD: Sending data to third parties
   analytics.track('user_performance', { userId, accuracy, topics })
   ```

4. **Preventing data deletion**
   ```typescript
   // BAD: Making deletion difficult
   if (confirmCount < 5) {
     return showAnotherWarning()
   }
   ```

5. **Dark patterns in consent**
   ```tsx
   // BAD: Making "agree" more prominent
   <Button variant="primary">Enable All Tracking</Button>
   <Link className="text-xs text-gray-400">maybe later</Link>
   ```

---

## Privacy-First Design Checklist

Before implementing any personalization feature:

- [ ] Does this require user consent?
- [ ] Is the data necessary for the feature?
- [ ] Can the feature work with less data?
- [ ] Is there a clear explanation for users?
- [ ] Can users disable this specific tracking?
- [ ] Is there a data retention limit?
- [ ] Is the data isolated per user?
- [ ] Is the data excluded from any third-party services?
- [ ] Can users export this data?
- [ ] Can users delete this data?

---

## User-Facing Privacy Notice

Display in Settings → Privacy:

```markdown
# How Synaptic Uses Your Data

## What We Collect
- Study session timing and duration
- Content format preferences
- Quiz and flashcard performance
- Topic engagement patterns

## What We Don't Collect
- Personal notes or documents (stored separately)
- Exact text you type
- Location beyond timezone
- Data from other apps

## How We Use It
- Recommend study times that work for you
- Suggest content formats you engage with
- Adjust difficulty to your level
- Highlight topics that need attention

## Your Control
- View all collected data anytime
- Export your complete profile
- Delete all personalization data
- Disable specific tracking features

## Data Storage
- Encrypted at rest and in transit
- Stored in secure cloud infrastructure
- Never shared with third parties
- Retained for 90 days (events) or until deleted
```
