---
name: personalization-engine
description: Learn from user interactions to create personalized learning experiences. Use continuously throughout every interaction when generating study materials, recommending strategies, adjusting difficulty, suggesting formats, or optimizing spaced repetition.
---

# Personalization Engine Skill

Learn from every user interaction to create increasingly customized learning experiences. Track preferences, performance patterns, learning behaviors, and adapt all aspects of Synaptic to each student's needs.

## Core Principles

1. **Learn Continuously**: Every interaction provides data
2. **Respect Privacy**: User data is theirs; be transparent about tracking
3. **Adapt Gradually**: Changes feel natural, not jarring
4. **Remain Flexible**: Allow users to override recommendations
5. **Explain Decisions**: Show why recommendations are made

## When to Apply

- Generating study materials (flashcards, podcasts, mind maps)
- Recommending study strategies
- Adjusting difficulty levels
- Suggesting content formats
- Planning study sessions
- Providing feedback
- Optimizing spaced repetition schedules

## The 8 Personalization Dimensions

### 1. Learning Style & Preferences

Track modality preferences (visual, auditory, reading/writing, kinesthetic):
- Flashcard usage → reading/writing preference
- Podcast engagement → auditory preference
- Mind map interaction → visual preference
- Quiz participation → kinesthetic preference

**Adaptation Strategy**:
```
Sessions 1-5:   Equal mix of all formats
Sessions 6-15:  60% preferred, 40% other
Sessions 16+:   80% preferred, 20% variety
```

### 2. Knowledge & Skill Level

Track per-subject proficiency:
- Mastery percentage (0-100%)
- Learning velocity (improvement rate)
- Prerequisite gaps
- Advanced readiness

**Difficulty Calibration**:
| Accuracy | Action |
|----------|--------|
| >90% | Increase difficulty, introduce advanced concepts |
| 70-85% | Maintain level, gradual progression |
| <60% | Decrease difficulty, review prerequisites |

### 3. Performance Patterns

Track accuracy and errors:
- By difficulty level
- By question type
- By time of day
- First-attempt vs. retry

**Error Categories**:
- Careless errors → Encourage verification steps
- Conceptual gaps → Return to prerequisites
- Recurring mistakes → Create focused practice

### 4. Study Habits & Behavior

Track session patterns:
- Frequency and duration
- Preferred times
- Completion rates
- Break patterns

**Optimize Based on Pattern**:
- Morning studier → Schedule challenging topics AM
- Evening studier → Deep work in evening
- Short sessions → Break content into chunks

### 5. Content Preferences

Track what resonates:
- Topic interests
- Preferred analogy types (sports, tech, gaming, nature)
- Complexity tolerance
- Jargon acceptance

**Customize Examples**:
```typescript
// If user engages with tech analogies:
"Think of spaced repetition like a cache invalidation strategy..."

// If user prefers sports examples:
"Like training for a marathon, knowledge builds with consistent practice..."
```

### 6. Engagement Triggers

Track what maintains focus:
- Progress visualization response
- Achievement/badge motivation
- Competitive elements
- Curiosity-driven exploration

**Feedback Style**:
| Profile | Approach |
|---------|----------|
| Praise-responsive | Frequent positive reinforcement |
| Direct-preferred | Concise corrections, skip pleasantries |
| Detail-seeker | Comprehensive explanations |

### 7. Communication Style

Track tone preferences:
- Formal vs. casual
- Concise vs. detailed
- Examples per concept
- Humor acceptance

### 8. Time & Context Awareness

Track temporal patterns:
- Peak productivity times
- Weekly patterns
- Deadline behavior
- Exam schedules

## Quick Reference: Applying Personalization

| Scenario | Personalization Action |
|----------|------------------------|
| Generating flashcards | Match difficulty to performance, use preferred example types |
| Creating podcast | Adjust technical depth to comfort level |
| Building mind map | Vary complexity based on visual preference |
| Chat response | Match communication style and tone |
| Review scheduling | Use personalized retention curves |
| Recommending content | Suggest preferred formats, relevant topics |

## Data Collection Points

Collect data at these touchpoints:
- Flashcard review (accuracy, response time, difficulty rating)
- Quiz completion (score, time taken, question types)
- Content generation (format chosen, topics selected)
- Session timing (start, end, breaks, completion)
- Engagement signals (scroll depth, pause points, help requests)

## Implementation Files

- [DATA-SCHEMA.md](DATA-SCHEMA.md): TypeScript interfaces for personalization data
- [IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md): Integration patterns for the codebase
- [PRIVACY-GUIDELINES.md](PRIVACY-GUIDELINES.md): Data collection and transparency rules

## Best Practices

**DO**:
- Collect data transparently
- Provide value from personalization
- Allow user control and overrides
- Adapt gradually, not abruptly
- Give users insights into their patterns

**DON'T**:
- Collect unnecessary data
- Lock into rigid personalization
- Make sudden jarring changes
- Create filter bubbles (always maintain variety)

## Success Metrics

Personalization works when:
- Engagement increases over time
- Study efficiency improves
- Retention rates increase
- Users report materials "feel right"
- Learning outcomes improve
