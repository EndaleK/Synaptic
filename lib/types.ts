export type MasteryLevel = 'learning' | 'reviewing' | 'mastered'

export interface Flashcard {
  id: string
  front: string
  back: string
  createdAt: Date
  // Spaced repetition fields
  masteryLevel?: MasteryLevel
  confidenceScore?: number  // 0-100
  timesReviewed?: number
  timesCorrect?: number
  lastReviewedAt?: Date
  nextReviewAt?: Date
}

export interface FlashcardSet {
  id: string
  name: string
  flashcards: Flashcard[]
  createdAt: Date
  updatedAt: Date
}