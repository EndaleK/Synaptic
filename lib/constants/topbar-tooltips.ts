/**
 * Tooltip content for top bar navigation links
 * Each tooltip provides a title, description, "best for" use case, and optional tip
 */

export interface TopBarTooltipContent {
  title: string
  description: string
  bestFor: string
  tip?: string
}

export const TOPBAR_TOOLTIPS: Record<string, TopBarTooltipContent> = {
  documents: {
    title: "Document Library",
    description: "Upload and manage your study materials. Supports PDF, DOCX, TXT, URLs, and YouTube videos.",
    bestFor: "Organizing study materials, uploading new content",
    tip: "Drag & drop files for quick upload"
  },
  library: {
    title: "Content Library",
    description: "Browse all your generated content: flashcards, podcasts, mind maps, and more in one place.",
    bestFor: "Finding and reviewing previously generated study materials"
  },
  calendar: {
    title: "Study Calendar",
    description: "Plan and schedule your study sessions. Sync with Google Calendar to stay organized.",
    bestFor: "Time management, scheduling study blocks, tracking deadlines"
  },
  statistics: {
    title: "Study Statistics",
    description: "Track your learning progress with detailed analytics. See streaks, time spent, and mastery levels.",
    bestFor: "Monitoring progress, identifying weak areas, staying motivated"
  },
  "study-plan": {
    title: "Study Plan",
    description: "AI-generated personalized study plans. Get structured learning paths tailored to your goals and timeline.",
    bestFor: "Exam prep, course planning, structured learning",
    tip: "Set a target date for best results"
  },
  "study-guide": {
    title: "Study Guide",
    description: "Comprehensive study guides generated from your documents. Get summaries, key concepts, and review questions.",
    bestFor: "Quick review, exam prep, understanding key concepts"
  }
}
