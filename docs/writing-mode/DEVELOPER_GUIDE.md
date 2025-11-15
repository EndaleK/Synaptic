# Writing Mode - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [Database Schema](#database-schema)
4. [State Management](#state-management)
5. [API Routes](#api-routes)
6. [Implementation Details](#implementation-details)
7. [Accessibility Implementation](#accessibility-implementation)
8. [Testing](#testing)
9. [Contributing](#contributing)

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Editor**: TipTap (ProseMirror based)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI Providers**: OpenAI, DeepSeek, Anthropic

### Design Principles
1. **Process Writing Theory**: 5-stage recursive process (Emig 1977)
2. **Student Agency**: AI transparency and tracking
3. **Accessibility First**: WCAG 2.1 AA compliance
4. **Mobile Responsive**: Desktop and mobile experiences
5. **Progressive Enhancement**: Core functionality without JavaScript

---

## Component Hierarchy

```
WritingView (Main Container)
├── WritingStageSelector (Desktop Navigation)
├── WritingEditor (TipTap Editor)
│   └── WritingSuggestionsExtension
├── Side Panel (Desktop) / Bottom Drawer (Mobile)
│   ├── Panel Navigation (4 Tabs)
│   └── Panel Content
│       ├── StageSpecificPanel
│       │   ├── OutlineGenerator (Planning)
│       │   ├── DiffViewer (Revising)
│       │   └── Stage-specific tips
│       ├── Progress Panel
│       │   ├── AIContributionTracker
│       │   ├── ProgressTracker
│       │   └── AccessibilitySettings
│       ├── WritingSuggestionPanel
│       └── CitationManager
├── TextToSpeechController (Conditional)
└── Mobile FAB (Floating Action Button)
```

---

## Database Schema

### Core Tables

#### `essays`
```sql
CREATE TABLE essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  word_count INTEGER DEFAULT 0,

  -- Metadata
  writing_type TEXT DEFAULT 'academic'
    CHECK (writing_type IN ('academic', 'professional', 'creative')),
  citation_style TEXT DEFAULT 'APA'
    CHECK (citation_style IN ('APA', 'MLA', 'Chicago', 'Harvard')),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'submitted')),

  -- Writing Process
  writing_stage TEXT DEFAULT 'planning'
    CHECK (writing_stage IN ('planning', 'drafting', 'revising', 'editing', 'publishing')),

  -- AI Tracking
  ai_contribution_percentage DECIMAL(5,2) DEFAULT 0.00,
  original_word_count INTEGER DEFAULT 0,
  ai_assisted_word_count INTEGER DEFAULT 0,

  -- Goals & Progress
  writing_goals JSONB DEFAULT '{}'::jsonb,
  submission_metadata JSONB DEFAULT '{}'::jsonb,

  -- Content
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  cited_sources JSONB DEFAULT '[]'::jsonb,
  version_history JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB Structures**:

```typescript
// writing_goals
{
  target_word_count?: number
  target_date?: string  // ISO 8601
  daily_word_count_goal?: number
}

// submission_metadata
{
  submitted_at?: string  // ISO 8601
  submitted_to?: string
  ai_disclosure_included?: boolean
  final_word_count?: number
}

// ai_suggestions
Array<{
  id: string
  type: 'grammar' | 'style' | 'clarity' | 'tone'
  category: string
  original_text: string
  suggested_text: string
  explanation: string
  start_position?: number
  end_position?: number
}>

// cited_sources
Array<{
  id: string
  type: 'book' | 'article' | 'website' | 'journal'
  title: string
  authors: string[]
  year: number
  url?: string
  doi?: string
  pages?: string
  publisher?: string
}>

// version_history
Array<{
  version_number: number
  content: string
  timestamp: string  // ISO 8601
  word_count: number
}>
```

#### `writing_sessions`
Tracks individual writing sessions for streak calculation.

```sql
CREATE TABLE writing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES essays(id) ON DELETE CASCADE,

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  words_written INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writing_sessions_user_date
  ON writing_sessions(user_id, DATE(started_at));
```

#### `writing_milestones`
Achievements and milestones.

```sql
CREATE TABLE writing_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES essays(id) ON DELETE SET NULL,

  type TEXT NOT NULL
    CHECK (type IN ('first_draft', 'word_count', 'streak', 'revision')),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(user_id, type, metadata)
);
```

#### `essay_comments`
Peer review and instructor feedback (future feature).

```sql
CREATE TABLE essay_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  essay_id UUID REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general'
    CHECK (comment_type IN ('general', 'suggestion', 'question', 'praise')),
  target_text TEXT,
  position_start INTEGER,
  position_end INTEGER,
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

#### `calculate_ai_contribution()`
```sql
CREATE OR REPLACE FUNCTION calculate_ai_contribution(
  p_original_count INTEGER,
  p_ai_assisted_count INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF (p_original_count + p_ai_assisted_count) = 0 THEN
    RETURN 0.00;
  END IF;

  RETURN ROUND(
    (p_ai_assisted_count::DECIMAL /
     (p_original_count + p_ai_assisted_count)::DECIMAL) * 100,
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### `get_writing_streak()`
```sql
CREATE OR REPLACE FUNCTION get_writing_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_session BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM writing_sessions
      WHERE user_id = p_user_id
        AND DATE(started_at) = check_date
    ) INTO has_session;

    EXIT WHEN NOT has_session;

    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
```

---

## State Management

### Local State (React)

**WritingView Component**:
```typescript
const [essay, setEssay] = useState<Essay | null>(null)
const [activePanel, setActivePanel] = useState<ActivePanel>('stage-tools')
const [isPanelOpen, setIsPanelOpen] = useState(true)
const [isMobile, setIsMobile] = useState(false)
const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilityConfig>(DEFAULT_CONFIG)
```

### localStorage Persistence

**Accessibility Settings**:
```typescript
// Saved to localStorage on change
localStorage.setItem('accessibility-settings', JSON.stringify(config))

// Loaded on mount
const saved = localStorage.getItem('accessibility-settings')
if (saved) {
  setAccessibilityConfig(JSON.parse(saved))
}
```

### Server State (Supabase)

All essay changes are immediately persisted to Supabase:

```typescript
const handleSave = async (content: string, title: string) => {
  const supabase = createClient()

  // Update database
  await supabase
    .from('essays')
    .update({
      content,
      title,
      word_count: calculateWordCount(content),
      updated_at: new Date().toISOString()
    })
    .eq('id', essay.id)

  // Update local state
  setEssay({ ...essay, content, title })
}
```

---

## API Routes

### Essay Management

#### `POST /api/essays/create`
Creates a new essay.

**Request**:
```json
{
  "title": "My Essay",
  "writing_type": "academic",
  "citation_style": "APA",
  "document_id": "uuid" // optional
}
```

**Response**:
```json
{
  "id": "uuid",
  "title": "My Essay",
  "writing_stage": "planning",
  "ai_contribution_percentage": 0,
  // ... full essay object
}
```

#### `GET /api/essays/[id]`
Retrieves an essay by ID.

#### `PUT /api/essays/[id]`
Updates an essay.

#### `DELETE /api/essays/[id]`
Deletes an essay.

### AI Features

#### `POST /api/writing/outline`
Generates essay outline using AI.

**Request**:
```json
{
  "topic": "Climate change impacts on agriculture",
  "writingType": "academic",
  "targetWordCount": 1500,
  "includeThesis": true,
  "outlineStyle": "traditional"
}
```

**Response**:
```json
{
  "outline": "I. Introduction\n  A. Hook...",
  "structure": [
    {
      "title": "Introduction",
      "points": ["Hook", "Background", "Thesis"],
      "level": 1
    }
  ],
  "metadata": {
    "topic": "...",
    "generatedAt": "2024-11-14T..."
  }
}
```

**Implementation**:
```typescript
// Uses flexible AI provider (OpenAI or DeepSeek)
const provider = getAIProvider('writing-outline')

const outlineText = await provider.generateText(
  systemPrompt,
  userPrompt,
  { temperature: 0.7, maxTokens: 1000 }
)
```

#### `POST /api/writing/analyze`
Analyzes essay and generates suggestions.

**Request**:
```json
{
  "content": "Essay text...",
  "writingType": "academic",
  "citationStyle": "APA"
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "type": "grammar",
      "category": "subject-verb agreement",
      "original_text": "The students is...",
      "suggested_text": "The students are...",
      "explanation": "Plural subject requires plural verb",
      "start_position": 42,
      "end_position": 58
    }
  ]
}
```

#### `POST /api/writing/paraphrase`
Paraphrases selected text while maintaining meaning.

#### `POST /api/writing/thesis-analyze`
Analyzes thesis statement strength.

### Export

#### `POST /api/writing/export`
Exports essay in specified format.

**Request**:
```json
{
  "essayId": "uuid",
  "format": "pdf",
  "includeAIDisclosure": true,
  "includeReferences": true
}
```

**Response**: Binary file (PDF or DOCX)

---

## Implementation Details

### Stage-Specific Behavior

**WritingEditor** automatically adjusts based on `writingStage` prop:

```typescript
const isDraftingStage = writingStage === 'drafting'
const [realTimeEnabled, setRealTimeEnabled] = useState(!isDraftingStage)

// Auto-disable grammar during drafting
useEffect(() => {
  if (writingStage === 'drafting') {
    setRealTimeEnabled(false)
  } else if (writingStage === 'editing' && !realTimeEnabled) {
    setRealTimeEnabled(true)
  }
}, [writingStage])
```

### AI Contribution Tracking

**Automatic Tracking**:
```typescript
const handleSave = async (content: string, title: string) => {
  // Calculate word count difference
  const newWordCount = calculateWordCount(content)
  const oldWordCount = essay.word_count
  const wordCountDiff = newWordCount - oldWordCount

  // Assume manual typing is "original"
  const newOriginalWordCount = essay.original_word_count + Math.max(0, wordCountDiff)

  // When AI suggestions are accepted, this is updated:
  // essay.ai_assisted_word_count += suggestionWordCount

  await supabase
    .from('essays')
    .update({
      content,
      word_count: newWordCount,
      original_word_count: newOriginalWordCount
      // ai_contribution_percentage calculated via function
    })
    .eq('id', essay.id)
}
```

**Accepting AI Suggestions**:
```typescript
const handleAcceptSuggestion = async (suggestionId: string) => {
  const suggestion = essay.ai_suggestions.find(s => s.id === suggestionId)
  const suggestionWordCount = calculateWordCount(suggestion.suggested_text)

  await supabase
    .from('essays')
    .update({
      ai_assisted_word_count: essay.ai_assisted_word_count + suggestionWordCount
    })
    .eq('id', essay.id)
}
```

### Version Management

**Auto-save with Version History**:
```typescript
const handleSave = async (content: string, title: string) => {
  // Create version snapshot before updating
  const newVersion = {
    version_number: essay.version_history.length + 1,
    content: essay.content,  // OLD content
    timestamp: new Date().toISOString(),
    word_count: essay.word_count
  }

  await supabase
    .from('essays')
    .update({
      content,  // NEW content
      title,
      version_history: [...essay.version_history, newVersion]
    })
    .eq('id', essay.id)
}
```

### Diff Algorithm

**Simple word-based diff** (used in DiffViewer):

```typescript
function calculateDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const diff: DiffSegment[] = []
  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (oldWords[oldIndex] === newWords[newIndex]) {
      diff.push({ type: 'unchanged', text: oldWords[oldIndex] })
      oldIndex++
      newIndex++
    } else {
      // Look ahead to find match
      const oldLookahead = oldWords.slice(oldIndex, oldIndex + 5)
      const newMatchIndex = oldLookahead.indexOf(newWords[newIndex])

      if (newMatchIndex > 0) {
        diff.push({ type: 'removed', text: oldWords.slice(oldIndex, oldIndex + newMatchIndex).join('') })
        oldIndex += newMatchIndex
      } else {
        // Single word change
        diff.push({ type: 'removed', text: oldWords[oldIndex] })
        diff.push({ type: 'added', text: newWords[newIndex] })
        oldIndex++
        newIndex++
      }
    }
  }

  return mergeDiff(diff)
}
```

---

## Accessibility Implementation

### Text-to-Speech

**Web Speech API**:
```typescript
const speakSentence = (index: number) => {
  const utterance = new SpeechSynthesisUtterance(sentences[index])

  // Set voice
  const voices = speechSynthesis.getVoices()
  utterance.voice = voices.find(v => v.name === voiceName)

  // Set rate
  utterance.rate = rate  // 0.5 - 2.0

  // Handle events
  utterance.onend = () => {
    // Move to next sentence or finish
    if (index < sentences.length - 1) {
      speakSentence(index + 1)
    }
  }

  speechSynthesis.speak(utterance)
}
```

### Custom CSS Properties

**Dynamic styling** via CSS variables:

```typescript
// Set in useAccessibilityStyles hook
root.style.setProperty('--editor-font-family',
  config.dyslexicFont ? '"OpenDyslexic", sans-serif' : 'inherit')

root.style.setProperty('--editor-font-size', `${config.fontSize}%`)
root.style.setProperty('--editor-line-height', config.lineSpacing.toString())
root.style.setProperty('--editor-letter-spacing', `${config.letterSpacing}px`)
```

```css
/* Applied to editor */
.accessibility-enabled .ProseMirror {
  font-family: var(--editor-font-family) !important;
  font-size: var(--editor-font-size) !important;
  line-height: var(--editor-line-height) !important;
  letter-spacing: var(--editor-letter-spacing) !important;
}
```

### ARIA Implementation

**Tablist Pattern**:
```tsx
<div role="tablist" aria-label="Writing tools">
  <button
    role="tab"
    aria-selected={activePanel === 'stage-tools'}
    aria-controls="panel-stage-tools"
    onClick={() => setActivePanel('stage-tools')}
  >
    Stage Tools
  </button>
</div>

<div
  id="panel-stage-tools"
  role="tabpanel"
  aria-labelledby="tab-stage-tools"
>
  {/* Panel content */}
</div>
```

**Skip Link**:
```tsx
<a href="#writing-editor" className="skip-to-main">
  Skip to editor
</a>

<div id="writing-editor" className="editor-container">
  <WritingEditor />
</div>
```

### Keyboard Navigation

**Global keyboard listener**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't interfere with editor
    if (e.target.closest('.ProseMirror')) return

    const isMod = e.metaKey || e.ctrlKey

    // Cmd/Ctrl+1-4: Switch panels
    if (isMod && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault()
      const panels = ['stage-tools', 'progress', 'suggestions', 'citations']
      setActivePanel(panels[parseInt(e.key) - 1])
      if (!isPanelOpen) setIsPanelOpen(true)
    }

    // Cmd/Ctrl+B: Toggle panel
    if (isMod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      setIsPanelOpen(!isPanelOpen)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isPanelOpen])
```

---

## Testing

### Unit Tests

**Example: AI Contribution Calculation**:
```typescript
import { calculateAIContribution } from '@/lib/writing/ai-tracking'

describe('calculateAIContribution', () => {
  it('calculates percentage correctly', () => {
    expect(calculateAIContribution(800, 200)).toBe(20.00)
    expect(calculateAIContribution(500, 500)).toBe(50.00)
    expect(calculateAIContribution(0, 0)).toBe(0.00)
  })

  it('handles edge cases', () => {
    expect(calculateAIContribution(1000, 0)).toBe(0.00)
    expect(calculateAIContribution(0, 1000)).toBe(100.00)
  })
})
```

### Integration Tests

**Example: Essay Creation Flow**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import WritingView from '@/components/WritingView'

describe('WritingView', () => {
  it('creates new essay and saves', async () => {
    render(<WritingView />)

    // Type title
    const titleInput = screen.getByLabelText('Essay title')
    fireEvent.change(titleInput, { target: { value: 'Test Essay' } })

    // Type content
    const editor = screen.getByRole('article')
    fireEvent.input(editor, { target: { textContent: 'Test content' } })

    // Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    // Verify saved
    await screen.findByText('Saved successfully')
  })
})
```

### Accessibility Tests

**axe-core Integration**:
```typescript
import { axe } from 'jest-axe'

it('has no accessibility violations', async () => {
  const { container } = render(<WritingView />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### E2E Tests

**Playwright Example**:
```typescript
import { test, expect } from '@playwright/test'

test('complete writing workflow', async ({ page }) => {
  await page.goto('/dashboard/writer')

  // Create essay
  await page.click('button:has-text("New Essay")')
  await page.fill('input[name="title"]', 'Test Essay')
  await page.click('button:has-text("Create")')

  // Change to drafting stage
  await page.click('button:has-text("Drafting")')

  // Verify grammar is disabled
  const draftingBadge = await page.locator('text=Drafting')
  await expect(draftingBadge).toBeVisible()

  // Type content
  await page.click('.ProseMirror')
  await page.keyboard.type('This is my essay content.')

  // Save
  await page.click('button:has-text("Save")')
  await expect(page.locator('text=Saved')).toBeVisible()
})
```

---

## Contributing

### Code Style

**TypeScript**:
- Use strict mode
- Prefer interfaces over types
- Export types alongside components

**React**:
- Functional components with hooks
- Props interfaces above component
- Destructure props in parameter

**File Organization**:
```
components/
├── WritingView.tsx              # Main container
├── WritingEditor.tsx            # Editor component
├── WritingView/                 # Subcomponents
│   ├── WritingStageSelector.tsx
│   ├── AIContributionTracker.tsx
│   ├── ProgressTracker.tsx
│   ├── AccessibilitySettings.tsx
│   └── useAccessibilityStyles.ts
```

### Adding New Stage-Specific Tools

1. Create component in `components/WritingView/`
2. Add to `StageSpecificPanel.tsx`:

```typescript
case 'newStage':
  return (
    <div className="space-y-6">
      <NewStageTool
        essayContent={essayContent}
        onComplete={() => {}}
      />
    </div>
  )
```

3. Update `WritingStage` type in `lib/supabase/types.ts`
4. Add database migration if needed

### Adding Accessibility Features

1. Add setting to `AccessibilityConfig` interface
2. Implement in `AccessibilitySettings.tsx`
3. Apply styles in `useAccessibilityStyles.ts`
4. Add CSS in `accessibility.css`
5. Test with screen reader and keyboard

### Pull Request Guidelines

**Required**:
- ✅ TypeScript compilation with no errors
- ✅ All tests passing
- ✅ Accessibility tests passing (axe-core)
- ✅ Documentation updated
- ✅ Tested on Chrome, Firefox, Safari
- ✅ Mobile responsive
- ✅ Screen reader tested

**PR Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Accessibility tests passing
- [ ] Manual testing completed

## Accessibility
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Focus indicators visible
- [ ] ARIA labels added
- [ ] Color contrast verified

## Screenshots
(if applicable)
```

---

## Performance Optimization

### Lazy Loading

**Dynamic imports for heavy components**:
```typescript
const DiffViewer = dynamic(() => import('./WritingView/DiffViewer'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})
```

### Memoization

**Expensive calculations**:
```typescript
const diff = useMemo(() => {
  return calculateDiff(selectedVersionContent, currentContent)
}, [selectedVersionContent, currentContent])

const stats = useMemo(() => {
  const added = diff.filter(d => d.type === 'added').length
  const removed = diff.filter(d => d.type === 'removed').length
  return { added, removed }
}, [diff])
```

### Debouncing

**Auto-save**:
```typescript
const debouncedSave = useMemo(
  () => debounce((content: string) => {
    handleSave(content, title)
  }, 2000),
  [title]
)

useEffect(() => {
  return () => debouncedSave.cancel()
}, [debouncedSave])
```

---

## Troubleshooting

### Common Issues

**1. TTS Not Working**
- Check browser compatibility (Chrome, Safari, Edge)
- Verify `window.speechSynthesis` exists
- Load voices after `voiceschanged` event

**2. CSS Not Applying**
- Ensure `accessibility.css` imported
- Check Tailwind purge configuration
- Verify CSS custom properties set

**3. Panel Not Updating**
- Check state synchronization
- Verify useEffect dependencies
- Check localStorage persistence

### Debug Mode

Enable debug logging:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('WritingView state:', {
    essay,
    activePanel,
    accessibilityConfig
  })
}
```

---

## Resources

### Documentation
- [TipTap Docs](https://tiptap.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance audits

### Community
- [GitHub Issues](https://github.com/synaptic/writing-mode/issues)
- [Discord](https://discord.gg/synaptic)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/synaptic)

---

**Version**: 1.0.0
**Last Updated**: November 14, 2024
**Maintainers**: Synaptic Development Team
