export interface Flashcard {
  id: string
  front: string
  back: string
  createdAt: Date
}

export interface FlashcardSet {
  id: string
  name: string
  flashcards: Flashcard[]
  createdAt: Date
  updatedAt: Date
}