// Personalization Engine - Core Algorithm
// Adapts AI prompts based on user's learning style and teaching preference

import type { LearningStyle, TeachingStylePreference } from '@/lib/supabase/types'

export interface LearningProfile {
  learningStyle: LearningStyle
  teachingStylePreference: TeachingStylePreference
  varkScores?: {
    visual: number
    auditory: number
    kinesthetic: number
    reading_writing: number
  }
  socraticPercentage?: number
}

export interface PersonalizationConfig {
  profile: LearningProfile
  mode: 'flashcards' | 'chat' | 'podcast' | 'mindmap'
}

/**
 * Main personalization engine - generates customized AI prompts
 */
export function personalizePrompt(config: PersonalizationConfig, basePrompt: string): string {
  const { profile, mode } = config

  // Get style-specific adaptations
  const styleAdaptations = getStyleAdaptations(profile.learningStyle, mode)

  // Get teaching method adaptations
  const teachingAdaptations = getTeachingAdaptations(profile.teachingStylePreference, mode)

  // Combine base prompt with personalization instructions
  return `${basePrompt}

PERSONALIZATION INSTRUCTIONS:
${styleAdaptations}

${teachingAdaptations}

Remember to maintain these personalization preferences throughout all generated content.`
}

/**
 * Get learning style specific adaptations for each mode
 */
function getStyleAdaptations(style: LearningStyle, mode: string): string {
  const adaptations: Record<LearningStyle, Record<string, string>> = {
    visual: {
      flashcards: `- Use rich visual metaphors and spatial language in explanations
- Include suggestions for mental imagery ("Picture this as...")
- Structure information hierarchically with clear visual organization
- Use color-coding concepts when describing relationships
- Emphasize patterns, diagrams, and visual connections`,

      chat: `- Describe concepts using visual metaphors and imagery
- Suggest the user create diagrams or sketches
- Use spatial language (above, below, connected to)
- Reference visual patterns and relationships
- Encourage visualization techniques`,

      podcast: `- Paint vivid visual pictures with descriptive language
- Use spatial metaphors for abstract concepts
- Describe colors, shapes, and visual patterns
- Reference diagrams that could be imagined
- Create mental imagery through detailed descriptions`,

      mindmap: `- Emphasize hierarchical relationships and spatial organization
- Use color-coded categories for different concept types
- Create clear visual distinction between main and supporting ideas
- Suggest visual symbols or icons for key concepts
- Organize information in radial, branching patterns`
    },

    auditory: {
      flashcards: `- Use rhythmic and memorable phrasing
- Include mnemonic devices and verbal patterns
- Emphasize sound-based associations
- Structure content for reading aloud
- Use repetition and verbal reinforcement`,

      chat: `- Use conversational, dialogue-based explanations
- Employ verbal reasoning and talk-through processes
- Suggest reading explanations aloud
- Use sound-based mnemonics and word associations
- Encourage discussion and verbal reflection`,

      podcast: `- OPTIMAL MODE: Leverage the auditory nature fully
- Use varied vocal tone and pacing in script
- Include verbal emphasis and repetition for key concepts
- Create dialogue between concepts or perspectives
- Use sound-based memory techniques`,

      mindmap: `- Include verbal labels and descriptive text
- Add pronunciation guides for technical terms
- Structure for reading aloud in logical order
- Use alliteration and rhyming for related concepts
- Include discussion prompts at each node`
    },

    kinesthetic: {
      flashcards: `- Use action-oriented language and active verbs
- Include practical examples and real-world applications
- Suggest hands-on activities or experiments
- Emphasize physical metaphors and movement
- Connect concepts to tangible experiences`,

      chat: `- Encourage hands-on exploration and experimentation
- Suggest practical activities to test understanding
- Use physical metaphors and action-based examples
- Prompt for real-world application
- Encourage trial-and-error learning`,

      podcast: `- Use dynamic, action-oriented language
- Include real-world scenarios and case studies
- Suggest pause points for physical activities
- Emphasize practical application over theory
- Use movement-based metaphors`,

      mindmap: `- Connect concepts to real-world actions and applications
- Include practical implementation steps
- Use action verbs in node labels
- Add hands-on activity suggestions
- Show cause-and-effect relationships clearly`
    },

    reading_writing: {
      flashcards: `- Provide detailed written explanations
- Use precise, well-structured language
- Include definitions and written examples
- Encourage note-taking and written summaries
- Emphasize written organization and lists`,

      chat: `- Provide comprehensive written explanations
- Encourage the user to write summaries
- Use structured, well-organized responses
- Include definitions and written examples
- Suggest note-taking strategies`,

      podcast: `- Use clear, well-articulated language
- Structure content with clear written-style organization
- Include definitions and explanations
- Suggest accompanying note-taking
- Emphasize lists, outlines, and structured content`,

      mindmap: `- Include detailed text descriptions at each node
- Provide written definitions and explanations
- Structure with clear hierarchical labels
- Add written notes and examples
- Organize with outline-style formatting`
    },

    mixed: {
      flashcards: `- Use a balanced multi-modal approach
- Combine visual, auditory, and kinesthetic elements
- Vary presentation styles across cards
- Include diverse types of examples
- Offer multiple ways to understand each concept`,

      chat: `- Adapt explanations using multiple modalities
- Offer visual descriptions, verbal reasoning, and practical examples
- Vary approach based on concept complexity
- Provide multiple perspectives on each topic
- Encourage diverse learning strategies`,

      podcast: `- Combine descriptive language with practical examples
- Use varied presentation styles
- Include visual descriptions and action-oriented content
- Appeal to multiple senses through language
- Provide comprehensive, multi-faceted explanations`,

      mindmap: `- Use multi-modal node content (text, visual cues, actions)
- Vary presentation across different branches
- Include diverse types of information
- Combine hierarchical structure with rich descriptions
- Offer multiple connection types`
    }
  }

  return adaptations[style]?.[mode] || adaptations.mixed[mode]
}

/**
 * Get teaching style adaptations for each mode
 */
function getTeachingAdaptations(teachingStyle: TeachingStylePreference, mode: string): string {
  const adaptations: Record<TeachingStylePreference, Record<string, string>> = {
    socratic: {
      flashcards: `TEACHING METHOD: Socratic (Guided Discovery)
- Frame answers as questions that lead to understanding
- Instead of direct definitions, provide guiding questions
- Example - Instead of "Photosynthesis is...", use "What process allows plants to convert light into energy? Consider: What do plants need? What do they produce?"
- Encourage critical thinking and self-discovery
- Provide hints and leading questions rather than direct answers`,

      chat: `TEACHING METHOD: Socratic (Guided Discovery)
- NEVER provide direct answers immediately
- Respond to questions with thoughtful counter-questions
- Guide the user to discover answers through inquiry
- Ask "What do you think?" and "Why might that be?"
- Provide hints only when the user is stuck
- Validate reasoning process, not just correct answers
- Example: User asks "What is X?" → You respond "Great question! Let's explore together. What do you already know about topics related to X? What patterns do you notice?"`,

      podcast: `TEACHING METHOD: Socratic (Guided Discovery)
- Structure as a dialogue with rhetorical questions
- Pose questions and guide the listener through reasoning
- Example: "You might be wondering, what causes this? Let's think about it step by step..."
- Build understanding progressively through inquiry
- Pause for reflection: "Before we continue, consider..."
- Guide discovery rather than lecture`,

      mindmap: `TEACHING METHOD: Socratic (Guided Discovery)
- Frame node content as guiding questions
- Instead of stating facts, pose inquiry prompts
- Example node: "What relationship exists between X and Y?" rather than "X causes Y"
- Include exploration prompts at each branch
- Encourage user to discover connections
- Use question-based labels for deeper nodes`
    },

    direct: {
      flashcards: `TEACHING METHOD: Direct Instruction
- Provide clear, concise definitions and explanations
- State facts and concepts explicitly
- Use straightforward language without ambiguity
- Include step-by-step processes
- Focus on clarity and comprehension`,

      chat: `TEACHING METHOD: Direct Instruction
- Provide clear, direct answers to questions
- Explain concepts thoroughly and explicitly
- Use structured, organized explanations
- Break down complex topics into clear steps
- Prioritize clarity and comprehensive coverage
- Confirm understanding with summaries`,

      podcast: `TEACHING METHOD: Direct Instruction
- Deliver clear, well-structured explanations
- State concepts and facts explicitly
- Use logical, linear progression
- Provide complete information without requiring inference
- Include summaries and key takeaways`,

      mindmap: `TEACHING METHOD: Direct Instruction
- Use clear, declarative statements in nodes
- Explicitly state relationships and connections
- Provide complete definitions and explanations
- Structure hierarchically with clear organization
- Include comprehensive information at each level`
    },

    mixed: {
      flashcards: `TEACHING METHOD: Mixed (Balanced Approach)
- Combine direct explanations with guiding questions
- Provide clear core information, then prompt reflection
- Example: "X is [definition]. Now consider: How might this apply to...?"
- Balance explicit teaching with discovery
- Use both statements and questions`,

      chat: `TEACHING METHOD: Mixed (Balanced Approach)
- Start with direct clarification, then guide exploration
- Provide core answers but encourage deeper inquiry
- Example: "X means [direct answer]. This raises an interesting question: Why do you think...?"
- Balance giving information with prompting discovery
- Adapt based on user's engagement level`,

      podcast: `TEACHING METHOD: Mixed (Balanced Approach)
- Combine clear explanations with reflective questions
- State key concepts directly, then explore implications
- Use both declarative statements and inquiry
- Balance lecture-style content with guided thinking
- Alternate between teaching and prompting`,

      mindmap: `TEACHING METHOD: Mixed (Balanced Approach)
- Use declarative statements for main nodes
- Include guiding questions in sub-nodes
- Balance explicit information with exploration prompts
- Combine clear structure with discovery elements
- Vary approach across different branches`
    }
  }

  return adaptations[teachingStyle]?.[mode] || adaptations.mixed[mode]
}

/**
 * Get personalized system instructions for a given mode
 */
export function getPersonalizedSystemPrompt(profile: LearningProfile, mode: 'flashcards' | 'chat' | 'podcast' | 'mindmap'): string {
  const basePrompts: Record<string, string> = {
    flashcards: 'You are an expert educational content creator specializing in flashcard generation.',
    chat: 'You are an AI tutor helping students learn from their study materials.',
    podcast: 'You are a podcast script writer creating engaging educational audio content.',
    mindmap: 'You are an expert at creating hierarchical mind maps that visualize concept relationships.'
  }

  return personalizePrompt({ profile, mode }, basePrompts[mode])
}

/**
 * Helper to create profile from user data
 */
export function createLearningProfile(
  learningStyle: LearningStyle,
  teachingStylePreference: TeachingStylePreference,
  varkScores?: { visual: number; auditory: number; kinesthetic: number; reading_writing: number },
  socraticPercentage?: number
): LearningProfile {
  return {
    learningStyle,
    teachingStylePreference,
    varkScores,
    socraticPercentage
  }
}
