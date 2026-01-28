/**
 * Tooltip content for dashboard study mode cards
 * Each tooltip provides a title, description, "best for" use case, and optional tip
 */

export interface StudyModeTooltipContent {
  title: string
  description: string
  bestFor: string
  tip?: string
}

export const STUDY_MODE_TOOLTIPS: Record<string, StudyModeTooltipContent> = {
  flashcards: {
    title: "Spaced Repetition Flashcards",
    description: "Review cards at scientifically optimized intervals. Our SM-2 algorithm schedules reviews right before you forget.",
    bestFor: "Memorizing vocabulary, facts, formulas, definitions",
    tip: "Badge shows cards due for review"
  },
  chat: {
    title: "Document Q&A Chat",
    description: "Have a conversation with your documents. Get answers grounded in your materials with Socratic teaching.",
    bestFor: "Deep comprehension, exploring concepts, clarifying confusion"
  },
  podcast: {
    title: "Full Audio Lesson",
    description: "Transform documents into 10-20 minute audio lessons. Perfect for learning while commuting.",
    bestFor: "Auditory learners, passive review, multitasking",
    tip: "Takes 2-3 minutes to generate"
  },
  "quick-summary": {
    title: "5-Minute Audio Highlights",
    description: "Key points from your document in a fast, energetic 5-minute summary.",
    bestFor: "Last-minute review, refreshing memory, getting the gist"
  },
  exam: {
    title: "Practice Mock Exam",
    description: "AI-generated practice questions: multiple choice, short answer, and essay formats.",
    bestFor: "Exam prep, identifying knowledge gaps, self-assessment"
  },
  mindmap: {
    title: "Visual Concept Map",
    description: "Interactive mind map showing how ideas connect. Visualize relationships between concepts.",
    bestFor: "Visual learners, understanding structure, seeing the big picture"
  },
  writer: {
    title: "Writing Practice Generator",
    description: "Practice prompts and writing exercises based on your materials. Get AI feedback.",
    bestFor: "Essay practice, written exams, developing arguments"
  },
  video: {
    title: "Learn from YouTube",
    description: "Search YouTube videos, extract transcripts, generate flashcards from video content.",
    bestFor: "Visual explanations, supplementing reading, diverse perspectives"
  }
}
