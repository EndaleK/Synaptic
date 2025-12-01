"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Download, Home, ChevronDown, RefreshCw, BookOpen, Sparkles, Zap, TrendingUp, Check, X, Share2, BookmarkPlus, BookmarkCheck } from "lucide-react"
import { useSwipeable } from "react-swipeable"
import { cn } from "@/lib/utils"
import { Flashcard, MasteryLevel } from "@/lib/types"
import DocumentSwitcherModal from "./DocumentSwitcherModal"
import ShareModal from "./ShareModal"
import { useToast } from "./ToastContainer"
import { useDocumentStore } from "@/lib/store/useStore"
import { useFlashcardStore } from "@/lib/store/useFlashcardStore"
import FlashcardSourceReference from "./FlashcardSourceReference"

interface FlashcardDisplayProps {
  flashcards: Flashcard[]
  onReset: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function FlashcardDisplay({ flashcards, onReset, onRegenerate, isRegenerating = false }: FlashcardDisplayProps) {
  const toast = useToast()
  const { currentDocument } = useDocumentStore()
  const { getPosition, setPosition, hasPosition } = useFlashcardStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(true) // Flashcards are auto-saved during generation
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mastery tracking state
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set())
  const [needsReviewCards, setNeedsReviewCards] = useState<Set<string>>(new Set())
  const [cardMasteryLevels, setCardMasteryLevels] = useState<Map<string, MasteryLevel>>(new Map())
  const [isUpdatingMastery, setIsUpdatingMastery] = useState(false)

  // Track updated repetitions for progress dots (maps card ID to repetitions count)
  const [cardRepetitions, setCardRepetitions] = useState<Map<string, number>>(new Map())

  // Study session tracking
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionStartTime = useRef<Date | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Deck ordering state - maintains order of cards with mastered cards at the end
  const [cardOrder, setCardOrder] = useState<number[]>(() =>
    Array.from({ length: flashcards.length }, (_, i) => i)
  )

  // Get the current card based on reordered deck
  const currentCard = flashcards[cardOrder[currentIndex]]
  const progress = ((studiedCards.size / flashcards.length) * 100).toFixed(0)
  const masteredCount = masteredCards.size
  const needsReviewCount = needsReviewCards.size

  // 🔄 CONTINUITY: Load saved position when flashcards change
  useEffect(() => {
    if (!currentDocument?.id || flashcards.length === 0) return

    const savedPosition = getPosition(currentDocument.id)
    if (savedPosition !== undefined && savedPosition < flashcards.length) {
      console.log('[FlashcardDisplay] Restored position:', savedPosition, 'for document:', currentDocument.id)
      setCurrentIndex(savedPosition)
      setFlipped(false) // Reset flip state when loading new position
    } else {
      console.log('[FlashcardDisplay] No saved position or out of range, starting at 0')
      setCurrentIndex(0)
    }
  }, [currentDocument?.id, flashcards.length, getPosition])

  // 🔄 CONTINUITY: Save position whenever it changes
  useEffect(() => {
    if (!currentDocument?.id || flashcards.length === 0) return

    console.log('[FlashcardDisplay] Saving position:', currentIndex, 'of', flashcards.length)
    setPosition(currentDocument.id, currentIndex, flashcards.length)
  }, [currentIndex, currentDocument?.id, flashcards.length, setPosition])

  // 📊 STATISTICS: Start study session when component mounts
  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await fetch('/api/study-sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            documentId: currentDocument?.id,
            sessionType: 'review',
            plannedDurationMinutes: 30 // Default estimate for flashcard review
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.sessionId)
          sessionStartTime.current = new Date()
          console.log('[FlashcardDisplay] Study session started:', data.sessionId)
        } else {
          const errorMessage = 'Failed to start study session'
          console.error(errorMessage, response.status)
          setSessionError(errorMessage)
        }
      } catch (error) {
        const errorMessage = 'Failed to start study session'
        console.error(errorMessage, error)
        setSessionError(errorMessage)
        // Don't show toast on start failure - it's not critical for user experience
      }
    }

    startSession()
  }, [currentDocument?.id])

  // 📊 STATISTICS: Complete study session when component unmounts
  useEffect(() => {
    return () => {
      // Complete session on unmount using fetch with keepalive
      if (sessionId && sessionStartTime.current) {
        const durationMinutes = Math.round((Date.now() - sessionStartTime.current.getTime()) / 60000)

        // Only record if session lasted at least 1 minute
        if (durationMinutes >= 1) {
          // Use fetch with keepalive: works during page unload and sets proper Content-Type header
          fetch('/api/study-sessions/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              sessionId,
              durationMinutes
            }),
            keepalive: true // Ensures request completes even during page unload
          }).then(response => {
            if (response.ok) {
              console.log('[FlashcardDisplay] Study session completed:', durationMinutes, 'minutes')
            } else {
              console.warn('[FlashcardDisplay] Failed to complete study session:', response.status)
              setSessionError('Failed to save study progress')
            }
          }).catch(error => {
            console.error('[FlashcardDisplay] Error completing study session:', error)
            setSessionError('Failed to save study progress')
          })
        }
      }
    }
  }, [sessionId])

  const handleNext = useCallback(() => {
    if (!studiedCards.has(currentCard.id)) {
      setStudiedCards(new Set([...studiedCards, currentCard.id]))
    }
    setFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
  }, [currentCard.id, studiedCards, flashcards.length])

  const handlePrevious = useCallback(() => {
    setFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }, [flashcards.length])

  const handleFlip = useCallback(() => {
    setFlipped(!flipped)
    if (!flipped && !studiedCards.has(currentCard.id)) {
      setStudiedCards(new Set([...studiedCards, currentCard.id]))
    }
  }, [flipped, currentCard.id, studiedCards])

  // Swipe gesture handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNext(),
    onSwipedRight: () => handlePrevious(),
    trackMouse: false, // Only track touch events, not mouse
    preventScrollOnSwipe: true,
    delta: 50, // Minimum distance for swipe to register (pixels)
  })

  // Check if flashcard has a valid database ID
  const hasValidDatabaseId = useCallback((id: string | number) => {
    if (!id) return false
    // Accept both numeric IDs (BIGINT from database) and UUIDs
    const idStr = String(id)
    // Valid if it's a number (BIGINT) or a UUID (36 chars with dashes)
    return !isNaN(Number(idStr)) || idStr.length >= 36
  }, [])

  // Handle mastery button clicks
  const handleMastery = useCallback(async (action: 'needs-review' | 'good') => {
    if (isUpdatingMastery || !currentCard.id) return

    // Check if flashcard has database ID
    if (!hasValidDatabaseId(currentCard.id)) {
      toast.error('Cannot track progress for unsaved flashcards')
      toast.info('Please regenerate flashcards to enable progress tracking')
      return
    }

    setIsUpdatingMastery(true)

    try {
      // Send action directly to API (good = quality 4, needs-review = quality 0)
      const response = await fetch('/api/flashcards/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          flashcardId: currentCard.id,
          action: action
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Mastery API error:', errorData)
        throw new Error(errorData.error || 'Failed to update mastery')
      }

      const data = await response.json()

      // Update the card's repetitions in local state for progress dots
      setCardRepetitions(prev => new Map(prev).set(currentCard.id, data.mastery.repetitions))

      // Update local state based on action
      if (action === 'good') {
        // "I Got It" - progress toward mastery
        // Check if this reaches mastered status (3+ repetitions)
        if (data.mastery.repetitions >= 3) {
          setMasteredCards(new Set([...masteredCards, currentCard.id]))
        }

        setNeedsReviewCards(prev => {
          const updated = new Set(prev)
          updated.delete(currentCard.id)
          return updated
        })

        // Move card to the end of the deck
        setCardOrder(prevOrder => {
          const newOrder = [...prevOrder]
          const currentCardIndex = newOrder[currentIndex]
          newOrder.splice(currentIndex, 1)
          newOrder.push(currentCardIndex)
          return newOrder
        })
      } else {
        // "I Don't Get It" - needs review
        setNeedsReviewCards(new Set([...needsReviewCards, currentCard.id]))
        setMasteredCards(prev => {
          const updated = new Set(prev)
          updated.delete(currentCard.id)
          return updated
        })

        // Move card forward a few positions for re-review
        setCardOrder(prevOrder => {
          const newOrder = [...prevOrder]
          const currentCardIndex = newOrder[currentIndex]
          newOrder.splice(currentIndex, 1)
          const insertPosition = Math.min(currentIndex + 3, newOrder.length)
          newOrder.splice(insertPosition, 0, currentCardIndex)
          return newOrder
        })
      }

      setCardMasteryLevels(prev => new Map(prev).set(currentCard.id, data.mastery.maturityLevel || data.mastery.level))

      // Move to next card automatically (stay at same index since we removed current card)
      setTimeout(() => {
        setFlipped(false)
        // Don't increment index for mastered cards since we removed the current one
        // For review cards, index naturally points to next card
      }, 300)

    } catch (error) {
      console.error('Error updating mastery:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update mastery'

      // Check if error is due to missing database columns
      if (errorMessage.includes('column') || errorMessage.includes('does not exist')) {
        toast.error('Database migration required')
        toast.info('Please apply the database migration to enable progress tracking. See URGENT-DATABASE-MIGRATION.md')
      } else if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
        toast.error('Flashcards must be saved to track progress')
        toast.info('Try regenerating flashcards to enable progress tracking')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsUpdatingMastery(false)
    }
  }, [currentCard.id, currentIndex, masteredCards, needsReviewCards, isUpdatingMastery, toast, hasValidDatabaseId])

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const dataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', filename)
    linkElement.click()
  }

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(flashcards, null, 2)
    const filename = `flashcards-${new Date().toISOString().split('T')[0]}.json`
    downloadFile(dataStr, filename, 'application/json')
    setShowExportMenu(false)
  }

  const handleSave = useCallback(async () => {
    // Flashcards are already saved to the database during generation
    // This button just provides visual confirmation
    setIsSaving(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      setIsSaved(true)
      toast.success('Flashcards already saved to library!')
    } catch (error) {
      console.error('Error confirming save:', error)
      toast.error('Error confirming save')
    } finally {
      setIsSaving(false)
    }
  }, [toast])

  const handleExportHTML = () => {
    const dateStr = new Date().toISOString().split('T')[0]

    // Helper function to escape HTML special characters
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Interactive Flashcards - ${dateStr}</title>
    <style>
        * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
        }
        .flashcard-app {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 2.2em;
            font-weight: 700;
        }
        .metadata {
            color: #718096;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        /* Progress Bar */
        .progress-container {
            margin: 20px 0;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        .progress-segment {
            position: absolute;
            height: 100%;
            transition: all 0.3s ease;
        }
        .progress-mastered {
            background: #10b981;
        }
        .progress-reviewed {
            background: #fbbf24;
        }
        .progress-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 0.85em;
        }
        .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #4a5568;
        }
        .stat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .stat-dot.mastered { background: #10b981; }
        .stat-dot.review { background: #ef4444; }
        /* Mastery Badge */
        .mastery-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .badge-mastered {
            background: #10b981;
            color: white;
        }
        .badge-review {
            background: #ef4444;
            color: white;
        }
        .flashcard-container {
            perspective: 1000px;
            margin: 20px 0;
            touch-action: manipulation;
            position: relative;
        }
        .flashcard {
            width: 100%;
            height: 400px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.6s;
            cursor: pointer;
            margin: 0 auto;
            touch-action: manipulation;
        }
        .flashcard:active {
            opacity: 0.95;
        }
        .flashcard.flipped {
            transform: rotateY(180deg);
        }
        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            border: 2px solid #e2e8f0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        .card-front {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card-back {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            transform: rotateY(180deg);
        }
        .card-content {
            font-size: 1.2em;
            line-height: 1.6;
            text-align: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
            width: 100%;
        }
        /* Mastery Buttons */
        .mastery-buttons {
            display: none;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        }
        .mastery-buttons.show {
            display: flex;
        }
        .mastery-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            touch-action: manipulation;
            min-height: 44px;
        }
        .mastery-btn:active {
            transform: scale(0.95);
        }
        .btn-review {
            background: #ef4444;
            color: white;
        }
        .btn-review:hover {
            background: #dc2626;
        }
        .btn-mastered {
            background: #10b981;
            color: white;
        }
        .btn-mastered:hover {
            background: #059669;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
            gap: 10px;
        }
        .nav-button {
            background: #4299e1;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(66, 153, 225, 0.3);
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
            min-width: 44px;
        }
        .nav-button:hover {
            background: #3182ce;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(66, 153, 225, 0.4);
        }
        .nav-button:active {
            transform: translateY(0);
            background: #2c5aa0;
        }
        .nav-button:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            opacity: 0.6;
        }
        .card-counter {
            color: #4a5568;
            font-weight: 600;
            font-size: 1.1em;
            flex-shrink: 0;
        }
        .flip-hint {
            color: #718096;
            font-size: 0.9em;
            margin-top: 15px;
        }
        .keyboard-hints {
            margin-top: 20px;
            padding: 15px;
            background: #f7fafc;
            border-radius: 10px;
            font-size: 0.85em;
            color: #4a5568;
        }
        .reset-btn {
            margin-top: 15px;
            padding: 8px 16px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
        }
        .reset-btn:hover {
            background: #4b5563;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .flashcard-app {
                padding: 20px;
            }
            h1 {
                font-size: 1.5em;
            }
            .flashcard-container {
                margin: 20px 0;
            }
            .flashcard {
                height: 350px;
            }
            .card-face {
                padding: 15px;
            }
            .card-content {
                font-size: 1em;
                line-height: 1.5;
            }
            .mastery-btn {
                padding: 10px 16px;
                font-size: 0.9em;
            }
            .nav-button {
                padding: 10px 16px;
                font-size: 0.9em;
                flex: 1;
                max-width: 120px;
            }
            .card-counter {
                font-size: 0.95em;
            }
            .flip-hint {
                font-size: 0.85em;
                margin-top: 10px;
            }
            .keyboard-hints {
                display: none;
            }
        }
        @media (max-width: 400px) {
            .flashcard {
                height: 300px;
            }
            .mastery-buttons {
                flex-direction: column;
                gap: 10px;
            }
            .mastery-btn {
                width: 100%;
            }
            .nav-button {
                padding: 8px 12px;
                font-size: 0.85em;
            }
        }
    </style>
</head>
<body>
    <div class="flashcard-app">
        <h1>📚 Interactive Flashcards</h1>
        <div class="metadata">
            Generated on ${new Date().toLocaleDateString()} • ${flashcards.length} cards
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-segment progress-mastered" id="progress-mastered"></div>
                <div class="progress-segment progress-reviewed" id="progress-reviewed"></div>
            </div>
            <div class="progress-stats">
                <div>
                    <span class="stat-item">
                        <span class="stat-dot mastered"></span>
                        <span id="mastered-count">0</span> mastered
                    </span>
                </div>
                <div>
                    <span class="stat-item">
                        <span class="stat-dot review"></span>
                        <span id="review-count">0</span> review
                    </span>
                </div>
                <div>
                    <span id="studied-count">0</span>/${flashcards.length}
                </span>
            </div>
        </div>

        <div class="flashcard-container">
            <!-- Mastery Badge -->
            <div id="mastery-badge" class="mastery-badge" style="display: none;"></div>

            <div class="flashcard" id="flashcard" onclick="flipCard()">
                <div class="card-face card-front">
                    <div class="card-content" id="front-content">
                        ${escapeHtml(flashcards[0]?.front || 'No cards available')}
                    </div>
                </div>
                <div class="card-face card-back">
                    <div class="card-content" id="back-content">
                        ${escapeHtml(flashcards[0]?.back || 'No cards available')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Mastery Buttons -->
        <div class="mastery-buttons" id="mastery-buttons">
            <button class="mastery-btn btn-review" onclick="handleMastery('review')">
                ✗ Review Again
            </button>
            <button class="mastery-btn btn-mastered" onclick="handleMastery('mastered')">
                ✓ Got it!
            </button>
        </div>

        <div class="flip-hint">Tap the card to flip it!</div>

        <div class="navigation">
            <button class="nav-button" id="prev-btn" onclick="previousCard()">← Previous</button>
            <div class="card-counter">
                <span id="current-card">1</span> of ${flashcards.length}
            </div>
            <button class="nav-button" id="next-btn" onclick="nextCard()">Next →</button>
        </div>

        <div class="keyboard-hints">
            <strong>Keyboard shortcuts:</strong> Space/Enter = Flip • ← → = Navigate • R = Reset
        </div>

        <button class="reset-btn" onclick="resetProgress()">Reset Progress</button>
    </div>

    <script>
        const flashcards = ${JSON.stringify(flashcards.map((card, idx) => ({ id: idx, front: escapeHtml(card.front), back: escapeHtml(card.back) })))};
        let currentIndex = 0;
        let isFlipped = false;

        // Mastery tracking with localStorage
        const STORAGE_KEY = 'flashcards_mastery_${dateStr}';
        let masteredCards = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY + '_mastered') || '[]'));
        let reviewCards = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY + '_review') || '[]'));
        let cardOrder = JSON.parse(localStorage.getItem(STORAGE_KEY + '_order') || JSON.stringify(Array.from({length: flashcards.length}, (_, i) => i)));

        function saveMasteryState() {
            localStorage.setItem(STORAGE_KEY + '_mastered', JSON.stringify(Array.from(masteredCards)));
            localStorage.setItem(STORAGE_KEY + '_review', JSON.stringify(Array.from(reviewCards)));
            localStorage.setItem(STORAGE_KEY + '_order', JSON.stringify(cardOrder));
        }

        function updateProgress() {
            const masteredCount = masteredCards.size;
            const reviewCount = reviewCards.size;
            const studied = new Set([...masteredCards, ...reviewCards]).size;

            document.getElementById('mastered-count').textContent = masteredCount;
            document.getElementById('review-count').textContent = reviewCount;
            document.getElementById('studied-count').textContent = studied;

            const masteredPercent = (masteredCount / flashcards.length) * 100;
            const reviewedPercent = ((studied - masteredCount) / flashcards.length) * 100;

            document.getElementById('progress-mastered').style.width = masteredPercent + '%';
            document.getElementById('progress-reviewed').style.left = masteredPercent + '%';
            document.getElementById('progress-reviewed').style.width = reviewedPercent + '%';
        }

        function updateMasteryBadge() {
            const badge = document.getElementById('mastery-badge');
            const cardId = cardOrder[currentIndex];

            if (masteredCards.has(cardId)) {
                badge.className = 'mastery-badge badge-mastered';
                badge.textContent = '✓ Mastered';
                badge.style.display = 'flex';
            } else if (reviewCards.has(cardId)) {
                badge.className = 'mastery-badge badge-review';
                badge.textContent = '✗ Review';
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        function updateCard() {
            const cardId = cardOrder[currentIndex];
            const card = flashcards[cardId];
            const frontContent = document.getElementById('front-content');
            const backContent = document.getElementById('back-content');
            const currentCardSpan = document.getElementById('current-card');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const masteryButtons = document.getElementById('mastery-buttons');

            if (card) {
                frontContent.innerHTML = card.front;
                backContent.innerHTML = card.back;
            }

            currentCardSpan.textContent = currentIndex + 1;

            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === cardOrder.length - 1;

            // Reset flip state when changing cards
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.remove('flipped');
            isFlipped = false;
            masteryButtons.classList.remove('show');

            updateMasteryBadge();
            updateProgress();
        }

        function flipCard() {
            const flashcard = document.getElementById('flashcard');
            const masteryButtons = document.getElementById('mastery-buttons');

            flashcard.classList.toggle('flipped');
            isFlipped = !isFlipped;

            if (isFlipped) {
                masteryButtons.classList.add('show');
            } else {
                masteryButtons.classList.remove('show');
            }
        }

        function handleMastery(action) {
            const cardId = cardOrder[currentIndex];

            if (action === 'mastered') {
                masteredCards.add(cardId);
                reviewCards.delete(cardId);

                // Move to end of deck
                cardOrder.splice(currentIndex, 1);
                cardOrder.push(cardId);
            } else {
                reviewCards.add(cardId);

                // Move 3 positions forward
                cardOrder.splice(currentIndex, 1);
                const insertPos = Math.min(currentIndex + 3, cardOrder.length);
                cardOrder.splice(insertPos, 0, cardId);
            }

            saveMasteryState();

            // Auto-advance after brief delay
            setTimeout(() => {
                if (currentIndex < cardOrder.length) {
                    updateCard();
                }
            }, 300);
        }

        function nextCard() {
            if (currentIndex < cardOrder.length - 1) {
                currentIndex++;
                updateCard();
            }
        }

        function previousCard() {
            if (currentIndex > 0) {
                currentIndex--;
                updateCard();
            }
        }

        function resetProgress() {
            if (confirm('Reset all progress? This will clear your mastery tracking.')) {
                masteredCards.clear();
                reviewCards.clear();
                cardOrder = Array.from({length: flashcards.length}, (_, i) => i);
                currentIndex = 0;
                saveMasteryState();
                updateCard();
            }
        }

        // Keyboard controls
        document.addEventListener('keydown', function(e) {
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    flipCard();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    previousCard();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextCard();
                    break;
                case 'r':
                case 'R':
                    currentIndex = 0;
                    updateCard();
                    break;
            }
        });

        // Initialize
        updateCard();
    </script>
</body>
</html>`

    const filename = `interactive-flashcards-${dateStr}.html`
    downloadFile(html, filename, 'text/html')
    setShowExportMenu(false)
  }

  const handleExportText = () => {
    const dateStr = new Date().toISOString().split('T')[0]
    const text = `FLASHCARDS
Generated on ${new Date().toLocaleDateString()}
Total cards: ${flashcards.length}

${flashcards.map((card, index) => `
Card ${index + 1} of ${flashcards.length}
Q: ${card.front}
A: ${card.back}
${'='.repeat(50)}`).join('\n')}`
    
    const filename = `flashcards-${dateStr}.txt`
    downloadFile(text, filename, 'text/plain')
    setShowExportMenu(false)
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // CRITICAL: Only capture keyboard shortcuts if this component is actually visible
      if (!containerRef.current) return

      // Check if component is visible in the DOM
      const isVisible = containerRef.current.offsetParent !== null &&
                       containerRef.current.getBoundingClientRect().height > 0

      if (!isVisible) {
        return // Component not visible, don't capture any keys
      }

      // Don't capture keyboard shortcuts if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement

      // Check if user is typing in any editable element
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('[contenteditable]') ||
        target.closest('.ProseMirror') || // TipTap editor
        target.closest('.tiptap') ||       // TipTap editor alternative class
        // Check if any parent is contenteditable
        (() => {
          let el = target
          while (el && el !== document.body) {
            if (el.isContentEditable) return true
            el = el.parentElement as HTMLElement
          }
          return false
        })()

      if (isTyping) {
        return // Let the user type normally
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          handleFlip()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
        case 'Escape':
          setShowExportMenu(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleFlip, handleNext, handlePrevious])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto py-3 md:py-5">
      {/* Header Section - Compact */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden mb-3 md:mb-4">
        <div className="p-3 md:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center flex-shrink-0 shadow">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
              <h2 className="text-lg md:text-2xl font-bold text-black dark:text-white truncate">
                Interactive Flashcards
              </h2>
              {/* Progress Summary */}
              {currentCard && hasValidDatabaseId(currentCard.id) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span>{cardRepetitions.get(currentCard.id) ?? currentCard.repetitions ?? 0}/3 reviews</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flashcard Viewer */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md card-hover border border-accent-primary/20 dark:border-accent-primary/30">
        <div className="border-b border-gray-200 dark:border-gray-700 px-2 py-2 md:px-4 md:py-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={onReset}
                className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors text-xs md:text-sm gap-1"
              >
                <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Back to Upload</span>
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center text-accent-primary hover:text-accent-secondary transition-colors text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed gap-1"
                  title="Generate different flashcards from the same content"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isRegenerating && "animate-spin")} />
                  <span className="hidden sm:inline">{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {currentIndex + 1}/{flashcards.length}
              </span>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                  isSaved
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg"
                    : "btn-primary"
                )}
                style={{
                  gap: "var(--space-1)",
                  padding: "var(--space-1) var(--space-2)",
                  fontSize: "var(--font-size-xs)"
                }}
                title={isSaved ? "Flashcards saved to library" : "Save flashcards to library"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                ) : (
                  <BookmarkPlus className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                </span>
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn-secondary btn-touch flex items-center gap-2 text-xs md:text-sm"
                >
                  <Download className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Export</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg text-gray-700 dark:text-gray-300 min-h-[44px] flex items-center"
                    >
                      JSON
                    </button>
                    <button
                      onClick={handleExportHTML}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[44px] flex items-center"
                    >
                      HTML
                    </button>
                    <button
                      onClick={handleExportText}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[44px] flex items-center"
                    >
                      Text
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    <button
                      onClick={() => {
                        setShowShareModal(true)
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg text-gray-700 dark:text-gray-300 min-h-[44px] flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share QR Code
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 md:p-4">
          <div className="mb-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="relative h-full rounded-full overflow-hidden">
                <div
                  className="absolute left-0 bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${(masteredCount / flashcards.length) * 100}%` }}
                />
                <div
                  className="absolute left-0 bg-yellow-500 h-full transition-all duration-300"
                  style={{
                    left: `${(masteredCount / flashcards.length) * 100}%`,
                    width: `${((studiedCards.size - masteredCount) / flashcards.length) * 100}%`
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600 dark:text-gray-400">{masteredCount} mastered</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-gray-600 dark:text-gray-400">{needsReviewCount} review</span>
                </span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {studiedCards.size}/{flashcards.length}
              </span>
            </div>
          </div>

          <div
            {...swipeHandlers}
            className="relative cursor-pointer h-72 md:h-80 lg:h-96 mb-3 md:mb-4"
          >
            {/* Progress Indicator - Shows dots (1-2) or "Mastered" (3+) */}
            {(() => {
              // Use updated repetitions from state if available, otherwise use card's value
              const repetitions = cardRepetitions.get(currentCard.id) ?? currentCard.repetitions ?? 0
              const isCorrect = repetitions > 0

              if (repetitions >= 3) {
                // Show "Mastered" badge after 3 successful reviews
                return (
                  <div className="absolute top-3 right-3 z-10 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 shadow-lg">
                    <Check className="h-4 w-4" />
                    <span>Mastered</span>
                  </div>
                )
              } else if (repetitions > 0 && isCorrect) {
                // Show progress dots for 1-2 successful reviews
                return (
                  <div className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-800 px-2 py-2 rounded-full shadow-lg flex items-center gap-1">
                    {Array.from({ length: repetitions }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-green-500"
                        title={`${repetitions}/3 reviews to mastery`}
                      />
                    ))}
                  </div>
                )
              }
              return null
            })()}

            <div
              className={cn(
                "absolute inset-0 w-full h-full transition-transform duration-500 cursor-pointer",
                "transform-style-preserve-3d",
                flipped ? "rotate-y-180" : ""
              )}
              onClick={handleFlip}
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-lg shadow-lg flex items-center justify-center backface-hidden border-2 border-accent-primary/30 dark:border-accent-primary/50 overflow-y-auto p-3 md:p-4"
                style={{
                  backfaceVisibility: "hidden",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <p className="text-sm md:text-base lg:text-lg text-center text-gray-800 dark:text-gray-100 break-words max-w-full leading-relaxed">
                  {currentCard.front}
                </p>
              </div>

              <div
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent-secondary/5 to-accent-primary/5 dark:from-accent-secondary/30 dark:to-accent-primary/30 rounded-lg shadow-lg flex flex-col items-center justify-center backface-hidden rotate-y-180 border-2 border-accent-secondary/30 dark:border-accent-secondary/50 overflow-y-auto p-3 md:p-4"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <p className="text-sm md:text-base lg:text-lg text-center text-gray-800 dark:text-gray-100 break-words max-w-full leading-relaxed">
                  {currentCard.back}
                </p>

                {/* Source Reference - Show when flipped and source data available */}
                {(currentCard.source_page || currentCard.source_section || currentCard.source_excerpt) && (
                  <div className="mt-4 w-full max-w-md">
                    <FlashcardSourceReference
                      source={{
                        page: currentCard.source_page,
                        section: currentCard.source_section,
                        excerpt: currentCard.source_excerpt,
                        chunk: currentCard.source_chunk
                      }}
                      documentName={currentDocument?.name}
                      documentId={currentCard.document_id}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Simple 2-Button Review System - Only show when flipped and flashcard has database ID */}
          {flipped && hasValidDatabaseId(currentCard.id) && (
            <div className="space-y-2 mt-3 mb-2">
              {/* Review quality buttons */}
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                <button
                  onClick={() => handleMastery('needs-review')}
                  disabled={isUpdatingMastery}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                  title="I don't get it - Review again"
                >
                  <X className="h-3 w-3" />
                  <span className="text-xs">I Don't Get It</span>
                </button>

                <button
                  onClick={() => handleMastery('good')}
                  disabled={isUpdatingMastery}
                  className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                  title="I got it - Progress toward mastery"
                >
                  <Check className="h-3 w-3" />
                  <span className="text-xs">I Got It</span>
                </button>
              </div>

              {/* Helper text */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Select "I Got It" 3 times to master this card
              </p>
            </div>
          )}

          {/* Info message if flashcards don't have database IDs */}
          {flipped && !hasValidDatabaseId(currentCard.id) && (
            <div className="flex justify-center items-center gap-2 mt-3 mb-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
              <span>💡 Regenerate to enable tracking</span>
            </div>
          )}

          <div className="flex justify-center items-center gap-3">
            <button
              onClick={handlePrevious}
              className="btn-secondary btn-touch-icon rounded-full p-2.5"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={handleFlip}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm md:text-base min-h-[44px]"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Flip</span>
            </button>

            <button
              onClick={handleNext}
              className="btn-secondary btn-touch-icon rounded-full p-2.5"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <p className="hidden md:block text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            Space to flip • Arrows to navigate
          </p>
        </div>
      </div>

      {/* Document Switcher */}
      <DocumentSwitcherModal
        onDocumentSwitch={() => {
          // Reset flashcard display when switching documents
          onReset()
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url="https://synaptic.study"
        title="Share Synaptic"
        description="Scan this QR code to access Synaptic - AI-powered personalized learning"
      />
    </div>
  )
}