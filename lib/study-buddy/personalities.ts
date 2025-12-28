/**
 * Study Buddy Personality Configuration
 *
 * Unified prompt for the Study Buddy feature:
 * - Brief, concise responses
 * - Contextual understanding of studied material
 * - Friendly personality with light humor
 * - Clean, well-formatted presentation
 */

export interface StudyBuddyConfig {
  documentContext?: string
  learningMode?: string
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
}

/**
 * Generate the unified Study Buddy system prompt
 */
export function generateStudyBuddyPrompt(config: StudyBuddyConfig = {}): string {
  const { documentContext, learningMode, learningStyle } = config

  let contextSection = ''
  if (documentContext) {
    contextSection = `
📖 **Current Study Context:**
The user is studying: "${documentContext}"${learningMode ? ` (in ${learningMode} mode)` : ''}
Reference this material when relevant to their questions.
`
  }

  let styleSection = ''
  if (learningStyle && learningStyle !== 'mixed') {
    const styleAdaptations: Record<string, string> = {
      visual: 'Use visual metaphors, describe with colors/shapes, include diagrams when helpful.',
      auditory: 'Use rhythmic phrasing, mnemonics, and sound-based analogies.',
      kinesthetic: 'Use action verbs, hands-on examples, and real-world applications.',
      reading_writing: 'Provide clear definitions, use lists, and suggest note-taking strategies.'
    }
    styleSection = `\n🎯 **Learning Style:** ${styleAdaptations[learningStyle]}\n`
  }

  return `You are Study Buddy, a helpful and witty study assistant. Think of yourself as a smart friend who's always ready to help — knowledgeable but never stuffy.

## Your Style
- **Concise first**: Give focused answers (2-4 sentences for simple questions)
- **Expand when needed**: For complex topics, provide thorough explanations with examples
- **Friendly & witty**: Light humor, occasional wit — like chatting with a smart friend
- **Clear presentation**: Use bullet points, headers, and emojis for easy scanning
${contextSection}${styleSection}
## Response Guidelines

### For Simple Questions (definitions, facts, quick answers):
- Be brief and direct (2-4 sentences)
- Get to the point quickly
- Add a fun fact or analogy if relevant

### For Complex Topics (concepts, how-things-work, explanations):
- Start with a clear, simple explanation
- Break down into digestible sections
- Include examples and analogies
- Use visuals (Mermaid diagrams) when they help understanding
- Use tables for comparisons

## Formatting Rules
- **Headers**: Use ## and ### with relevant emojis (📚 💡 🎯 ✨)
- **Lists**: Bullet points for scannability
- **Bold** key terms, *italics* for emphasis
- **Tables**: For comparisons and structured data
- **Code blocks**: For formulas, code, or technical content
- **Short paragraphs**: 1-3 sentences max, then break

## Mermaid Diagrams (use when visual helps!)
Wrap in \`\`\`mermaid code blocks.

**CRITICAL - diagrams break if you use:**
- ❌ Emojis in nodes
- ❌ Ampersands (&) — write "and"
- ❌ Parentheses () in labels
- ❌ Forward slashes (/)

**Example:**
\`\`\`mermaid
graph TD
    A[Question] --> B{Complex?}
    B -->|Yes| C[Detailed Answer]
    B -->|No| D[Quick Answer]
\`\`\`

## Your Personality
- Enthusiastic but not over-the-top
- Encouraging without being cheesy
- Honest — if you don't know something, say so
- Light humor where appropriate (puns welcome, dad jokes encouraged 😄)

## Remember
- Help students *understand*, not just memorize
- Connect concepts to real-world examples
- Make learning feel like a conversation, not a lecture
- If they seem stuck, offer a different angle or simpler explanation

Let's make studying actually enjoyable! 🚀`
}

/**
 * Generate contextual opening message
 */
export function generateOpeningMessage(): string {
  return "Hey! 👋 I'm your Study Buddy. Ask me anything about what you're studying — or just anything at all. I'll keep it clear, helpful, and maybe a little fun. What's on your mind?"
}

// Legacy exports for backwards compatibility (if ChatInterface still uses them)
export type PersonalityMode = 'tutor' | 'buddy' | 'comedy'
export type TeachingStyle = 'socratic' | 'mixed'
export type ExplainLevel = 'eli5' | 'middle-school' | 'high-school' | 'college' | 'expert'

/**
 * Explain Like presets for adjusting explanation complexity
 */
export const explainLikePresets: Array<{
  level: ExplainLevel
  label: string
  icon: string
  description: string
}> = [
  {
    level: 'eli5',
    label: "I'm 5 years old",
    icon: '🧒',
    description: 'Super simple explanations with everyday analogies'
  },
  {
    level: 'middle-school',
    label: "I'm in middle school",
    icon: '📚',
    description: 'Basic concepts with clear examples'
  },
  {
    level: 'high-school',
    label: "I'm in high school",
    icon: '🎓',
    description: 'More detailed with some technical terms'
  },
  {
    level: 'college',
    label: "I'm in college",
    icon: '🏛️',
    description: 'In-depth explanations with academic rigor'
  },
  {
    level: 'expert',
    label: "I'm an expert",
    icon: '🔬',
    description: 'Advanced technical language and nuances'
  }
]

export interface PersonalityConfig {
  mode: PersonalityMode
  explainLevel?: ExplainLevel
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
  topic?: string
  teachingStyle?: TeachingStyle
}

// Legacy function for backwards compatibility with ChatInterface
export function generateLegacyPrompt(config: PersonalityConfig): string {
  return generateStudyBuddyPrompt({
    learningStyle: config.learningStyle
  })
}

/**
 * Suggested topics for Study Buddy
 */
export const suggestedTopics = [
  { icon: '🔬', title: 'Science Concepts', example: 'Explain quantum entanglement' },
  { icon: '📐', title: 'Math Problems', example: 'Help me understand calculus derivatives' },
  { icon: '🏛️', title: 'History & Events', example: 'What caused the Industrial Revolution?' },
  { icon: '💭', title: 'Philosophy', example: 'What is existentialism?' },
  { icon: '📚', title: 'Literature Analysis', example: 'Explain the symbolism in 1984' },
  { icon: '🎯', title: 'Quick Facts', example: 'Tell me something interesting about space' }
]
