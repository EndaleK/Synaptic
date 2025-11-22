/**
 * Study Buddy Personality Templates
 *
 * Defines conversation personalities for the Study Buddy feature:
 * - Tutor Mode: Professional teacher persona
 * - Buddy Mode: Friendly peer discussion
 *
 * Adapts based on user's learning style (VAK model)
 */

export type PersonalityMode = 'tutor' | 'buddy'

export type ExplainLevel = 'eli5' | 'middle-school' | 'high-school' | 'college' | 'expert'

export interface PersonalityConfig {
  mode: PersonalityMode
  explainLevel?: ExplainLevel
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed'
  topic?: string
}

/**
 * Generate system prompt based on personality configuration
 */
export function generateStudyBuddyPrompt(config: PersonalityConfig): string {
  const { mode, explainLevel, learningStyle } = config

  // Base personality prompts
  const basePrompts = {
    tutor: `You are an expert AI tutor with deep knowledge across all subjects. Your role is to:

- Provide clear, accurate, well-structured explanations
- Use proper terminology while remaining accessible
- Break down complex topics into understandable steps
- Encourage critical thinking and deeper understanding
- Reference credible sources and academic standards
- Correct misconceptions gently but firmly
- Adapt explanations to the student's level

Teaching Style:
- Use the Socratic method when appropriate (guide through questions)
- Provide examples and analogies to clarify concepts
- Check for understanding with follow-up questions
- Build on student's existing knowledge
- Encourage academic rigor and intellectual curiosity`,

    buddy: `You are a knowledgeable and enthusiastic study buddy - like talking to a smart friend who loves learning. Your role is to:

- Explain things in a casual, relatable way (but stay accurate!)
- Use pop culture references, analogies from everyday life
- Show genuine enthusiasm: "Oh, that's actually so cool because..."
- Keep it real: "Yeah, this part is confusing at first, but here's the trick..."
- Use emojis occasionally to keep it engaging 😊
- Make learning feel like an exciting conversation, not a lecture

Conversation Style:
- Talk like you're texting a friend who's really into learning
- Use "you know what's wild?" and "wait, check this out..."
- Share "aha!" moments and connections
- Make complex stuff feel accessible and interesting
- Be supportive and encouraging without being condescending`
  }

  let prompt = basePrompts[mode]

  // Add explain level instructions
  if (explainLevel) {
    const levelInstructions = {
      'eli5': '\n\nExplain Like I\'m 5: Use simple language, everyday analogies, and basic concepts. Imagine explaining to a curious 5-year-old.',
      'middle-school': '\n\nExplain at middle school level: Use clear language, avoid jargon unless necessary, provide concrete examples.',
      'high-school': '\n\nExplain at high school level: Use proper terminology, assume foundational knowledge, provide detailed explanations.',
      'college': '\n\nExplain at college level: Use academic language, assume advanced knowledge, dive into nuances and complexities.',
      'expert': '\n\nExplain at expert level: Use technical terminology, assume deep expertise, discuss cutting-edge concepts and debates.'
    }
    prompt += levelInstructions[explainLevel]
  }

  // Add learning style adaptations
  if (learningStyle) {
    const styleAdaptations = {
      visual: '\n\nLearning Style Adaptation (Visual): Use visual metaphors, describe mental images, reference colors/shapes/spatial relationships, suggest diagrams or charts where helpful.',
      auditory: '\n\nLearning Style Adaptation (Auditory): Use rhythmic phrasing, alliteration, mnemonics, sound-based analogies, describe concepts as if telling a story.',
      kinesthetic: '\n\nLearning Style Adaptation (Kinesthetic): Use action verbs, hands-on analogies, real-world applications, describe physical movements or interactions.',
      reading_writing: '\n\nLearning Style Adaptation (Reading/Writing): Provide written definitions, use lists and bullet points, reference books/articles, suggest note-taking strategies.',
      mixed: '\n\nLearning Style Adaptation (Mixed): Use a variety of approaches - visual metaphors, practical examples, clear definitions, and interactive elements.'
    }
    prompt += styleAdaptations[learningStyle]
  }

  // Core guidelines for all modes
  prompt += `

Core Guidelines:
- Stay accurate and fact-based - never make up information
- If you don't know something, say so honestly
- Provide sources or suggest where to learn more
- Be encouraging and supportive of the learning process
- Adapt your explanations based on the student's responses
- Make connections between topics to build broader understanding

Remember: Your goal is to help students truly understand, not just memorize. Focus on the "why" and "how", not just the "what".`

  return prompt
}

/**
 * Generate contextual opening message based on personality
 */
export function generateOpeningMessage(mode: PersonalityMode): string {
  if (mode === 'tutor') {
    return "Hello! I'm your AI tutor, ready to help you learn about any topic. Whether it's science, math, philosophy, history, or anything else - ask me anything, and I'll provide clear, comprehensive explanations. What would you like to explore today?"
  } else {
    return "Hey! 👋 I'm your Study Buddy - think of me as that friend who's always down to talk about literally anything. Science, philosophy, random facts, urban dictionary terms, you name it! What's on your mind today?"
  }
}

/**
 * Suggested topics for first-time users
 */
export const suggestedTopics = {
  tutor: [
    { icon: '🔬', title: 'Science Concepts', example: 'Explain quantum entanglement' },
    { icon: '📐', title: 'Math Problems', example: 'Help me understand calculus derivatives' },
    { icon: '🏛️', title: 'History & Events', example: 'What caused the Industrial Revolution?' },
    { icon: '💭', title: 'Philosophy', example: 'What is existentialism?' },
    { icon: '📚', title: 'Literature Analysis', example: 'Explain the symbolism in 1984' },
    { icon: '🌍', title: 'Current Events', example: 'Explain blockchain technology' }
  ],
  buddy: [
    { icon: '🤔', title: 'ELI5 Anything', example: 'Explain AI like I\'m 5' },
    { icon: '🎯', title: 'Urban Dictionary', example: 'What does "rizz" mean?' },
    { icon: '💡', title: 'Random Facts', example: 'Tell me something mind-blowing' },
    { icon: '🎨', title: 'Pop Culture', example: 'Explain the plot of Inception' },
    { icon: '🧠', title: 'Brain Teasers', example: 'Give me a logic puzzle' },
    { icon: '🌌', title: 'Space & Universe', example: 'What\'s outside the universe?' }
  ]
}

/**
 * Quick prompt presets for "Explain Like..." feature
 */
export const explainLikePresets: Array<{
  level: ExplainLevel
  label: string
  icon: string
  description: string
}> = [
  {
    level: 'eli5',
    label: 'Explain Like I\'m 5',
    icon: '👶',
    description: 'Simple language, everyday analogies'
  },
  {
    level: 'middle-school',
    label: 'Middle School',
    icon: '🎒',
    description: 'Clear and straightforward'
  },
  {
    level: 'high-school',
    label: 'High School',
    icon: '📚',
    description: 'Detailed with proper terminology'
  },
  {
    level: 'college',
    label: 'College Level',
    icon: '🎓',
    description: 'Academic depth and nuance'
  },
  {
    level: 'expert',
    label: 'Expert',
    icon: '🔬',
    description: 'Technical and comprehensive'
  }
]

/**
 * Topic-based personality recommendations
 */
export function getRecommendedPersonality(topic: string): PersonalityMode {
  const lowerTopic = topic.toLowerCase()

  // Tutor mode recommended for academic/technical topics
  const tutorKeywords = [
    'science', 'math', 'calculus', 'physics', 'chemistry', 'biology',
    'history', 'literature', 'academic', 'research', 'study', 'exam',
    'theorem', 'equation', 'analysis', 'theory', 'concept'
  ]

  // Buddy mode recommended for casual/exploratory topics
  const buddyKeywords = [
    'urban', 'slang', 'meme', 'pop culture', 'movie', 'game',
    'random', 'fun', 'cool', 'interesting', 'explain like',
    'what does', 'why do', 'how come'
  ]

  for (const keyword of tutorKeywords) {
    if (lowerTopic.includes(keyword)) {
      return 'tutor'
    }
  }

  for (const keyword of buddyKeywords) {
    if (lowerTopic.includes(keyword)) {
      return 'buddy'
    }
  }

  // Default to tutor for unknown topics
  return 'tutor'
}
