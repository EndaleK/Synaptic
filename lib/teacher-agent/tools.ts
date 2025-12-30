/**
 * Tool definitions for the Agentic Teacher
 * Uses Anthropic's Claude tool calling format
 */

import { ClaudeToolDefinition, TeacherToolName } from './types'

// Tool metadata including estimated durations
export const toolMetadata: Record<TeacherToolName, {
  icon: string
  displayName: string
  estimatedDuration: string
  category: 'generate' | 'navigate' | 'analyze' | 'plan'
}> = {
  generate_flashcards: {
    icon: 'Cards',
    displayName: 'Generate Flashcards',
    estimatedDuration: '30-60 seconds',
    category: 'generate'
  },
  generate_podcast: {
    icon: 'Headphones',
    displayName: 'Generate Podcast',
    estimatedDuration: '2-3 minutes',
    category: 'generate'
  },
  generate_mindmap: {
    icon: 'GitBranch',
    displayName: 'Generate Mind Map',
    estimatedDuration: '20-40 seconds',
    category: 'generate'
  },
  generate_quiz: {
    icon: 'ClipboardCheck',
    displayName: 'Generate Quiz',
    estimatedDuration: '30-60 seconds',
    category: 'generate'
  },
  generate_quick_summary: {
    icon: 'Zap',
    displayName: 'Quick Summary',
    estimatedDuration: '1-2 minutes',
    category: 'generate'
  },
  start_review_session: {
    icon: 'RotateCcw',
    displayName: 'Start Review',
    estimatedDuration: 'Instant',
    category: 'navigate'
  },
  search_documents: {
    icon: 'Search',
    displayName: 'Search Documents',
    estimatedDuration: '2-5 seconds',
    category: 'analyze'
  },
  explain_concept: {
    icon: 'Lightbulb',
    displayName: 'Explain Concept',
    estimatedDuration: '10-20 seconds',
    category: 'analyze'
  },
  create_study_plan: {
    icon: 'Calendar',
    displayName: 'Create Study Plan',
    estimatedDuration: '15-30 seconds',
    category: 'plan'
  },
  switch_mode: {
    icon: 'ArrowRight',
    displayName: 'Switch Mode',
    estimatedDuration: 'Instant',
    category: 'navigate'
  }
}

// Claude tool definitions in Anthropic's format
export const teacherTools: ClaudeToolDefinition[] = [
  {
    name: 'generate_flashcards',
    description: 'Generate flashcards from a document to help the user memorize key concepts. Use this when the user wants to study, memorize, or review material from a document.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The ID of the document to generate flashcards from'
        },
        topicFilter: {
          type: 'string',
          description: 'Optional specific topic or chapter to focus on'
        },
        count: {
          type: 'number',
          description: 'Number of flashcards to generate (default: 20, max: 50)'
        }
      },
      required: ['documentId']
    }
  },
  {
    name: 'generate_podcast',
    description: 'Generate an audio podcast/lesson from a document. Use this when the user prefers auditory learning, wants to listen while doing other activities, or asks for an audio explanation.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The ID of the document to create a podcast from'
        },
        topics: {
          type: 'array',
          description: 'Specific topics to cover in the podcast',
          items: { type: 'string' }
        },
        style: {
          type: 'string',
          description: 'The style of the podcast',
          enum: ['conversational', 'lecture', 'interview']
        }
      },
      required: ['documentId']
    }
  },
  {
    name: 'generate_mindmap',
    description: 'Generate a visual mind map showing relationships between concepts in a document. Use this when the user wants to see the big picture, understand connections, or prefers visual learning.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The ID of the document to create a mind map from'
        },
        focusTopic: {
          type: 'string',
          description: 'Optional specific topic to center the mind map around'
        }
      },
      required: ['documentId']
    }
  },
  {
    name: 'generate_quiz',
    description: 'Generate a practice quiz to test understanding of material. Use this when the user wants to test themselves, prepare for an exam, or check their knowledge.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The ID of the document to create a quiz from'
        },
        difficulty: {
          type: 'string',
          description: 'The difficulty level of the quiz',
          enum: ['easy', 'medium', 'hard']
        },
        count: {
          type: 'number',
          description: 'Number of questions (default: 10, max: 30)'
        }
      },
      required: ['documentId']
    }
  },
  {
    name: 'generate_quick_summary',
    description: 'Generate a 5-minute audio summary of content. Use this when the user wants a quick overview or is short on time.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'The ID of the document to summarize'
        },
        url: {
          type: 'string',
          description: 'URL to summarize (alternative to documentId)'
        }
      },
      required: []
    }
  },
  {
    name: 'start_review_session',
    description: 'Start a spaced repetition review session with flashcards that are due. Use this when the user has cards to review or wants to reinforce their memory.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Optional document ID to filter cards by'
        },
        cardCount: {
          type: 'number',
          description: 'Maximum number of cards to review (default: all due cards)'
        }
      },
      required: []
    }
  },
  {
    name: 'search_documents',
    description: 'Search through the user\'s uploaded documents to find relevant information. Use this to find specific content or answer questions about their materials.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant content'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'explain_concept',
    description: 'Provide a detailed explanation of a concept, potentially using context from documents. Use this when the user asks "what is...", "explain...", or doesn\'t understand something.',
    input_schema: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'The concept to explain'
        },
        documentContext: {
          type: 'string',
          description: 'Optional document ID to use as context for the explanation'
        }
      },
      required: ['concept']
    }
  },
  {
    name: 'create_study_plan',
    description: 'Create a personalized study plan with scheduled sessions that will be added to the calendar. IMPORTANT: Before calling this tool, you MUST ask the user for: 1) When is their exam/deadline? 2) Which documents they want to study (use their document list). Only call this tool once you have both the exam date and at least one document selected.',
    input_schema: {
      type: 'object',
      properties: {
        examDate: {
          type: 'string',
          description: 'The exam or deadline date in ISO format (YYYY-MM-DD). REQUIRED - ask the user if not provided.'
        },
        examTitle: {
          type: 'string',
          description: 'Title for the exam or study goal (e.g., "Biology Final", "Chapter 5 Review")'
        },
        documentIds: {
          type: 'array',
          description: 'Array of document IDs to include in the study plan. Get these from the user\'s document list.',
          items: { type: 'string' }
        },
        dailyTargetHours: {
          type: 'number',
          description: 'Hours per day to study (default: 2)'
        },
        includeWeekends: {
          type: 'boolean',
          description: 'Whether to include weekend study sessions (default: true)'
        }
      },
      required: ['examDate', 'documentIds']
    }
  },
  {
    name: 'switch_mode',
    description: 'Navigate to a different study mode in the app. Use this to help the user access different features.',
    input_schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'The study mode to switch to',
          enum: ['home', 'chat', 'flashcards', 'podcast', 'mindmap', 'quiz', 'quick-summary', 'study-guide', 'writer', 'video']
        },
        documentId: {
          type: 'string',
          description: 'Optional document to load in the new mode'
        }
      },
      required: ['mode']
    }
  }
]

// Get tool definition by name
export function getToolByName(name: TeacherToolName): ClaudeToolDefinition | undefined {
  return teacherTools.find(t => t.name === name)
}

// Get tool metadata by name
export function getToolMetadata(name: TeacherToolName) {
  return toolMetadata[name]
}

// Validate tool input against schema
export function validateToolInput(
  toolName: TeacherToolName,
  input: Record<string, unknown>
): { valid: boolean; error?: string } {
  const tool = getToolByName(toolName)
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` }
  }

  const { required } = tool.input_schema
  for (const field of required) {
    if (!(field in input) || input[field] === undefined || input[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
  }

  return { valid: true }
}
