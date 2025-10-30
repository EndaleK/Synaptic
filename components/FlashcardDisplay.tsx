"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Download, Home, ChevronDown, RefreshCw, BookOpen, Sparkles, Zap, TrendingUp, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Flashcard, MasteryLevel } from "@/lib/types"
import DocumentSwitcherModal from "./DocumentSwitcherModal"

interface FlashcardDisplayProps {
  flashcards: Flashcard[]
  onReset: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function FlashcardDisplay({ flashcards, onReset, onRegenerate, isRegenerating = false }: FlashcardDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Mastery tracking state
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set())
  const [needsReviewCards, setNeedsReviewCards] = useState<Set<string>>(new Set())
  const [cardMasteryLevels, setCardMasteryLevels] = useState<Map<string, MasteryLevel>>(new Map())
  const [isUpdatingMastery, setIsUpdatingMastery] = useState(false)

  // Deck ordering state - maintains order of cards with mastered cards at the end
  const [cardOrder, setCardOrder] = useState<number[]>(() =>
    Array.from({ length: flashcards.length }, (_, i) => i)
  )

  // Get the current card based on reordered deck
  const currentCard = flashcards[cardOrder[currentIndex]]
  const progress = ((studiedCards.size / flashcards.length) * 100).toFixed(0)
  const masteredCount = masteredCards.size
  const needsReviewCount = needsReviewCards.size

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

  // Handle mastery button clicks
  const handleMastery = useCallback(async (action: 'mastered' | 'needs-review') => {
    if (isUpdatingMastery || !currentCard.id) return

    setIsUpdatingMastery(true)

    try {
      const response = await fetch('/api/flashcards/mastery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          action
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update mastery')
      }

      const data = await response.json()

      // Update local state
      if (action === 'mastered') {
        setMasteredCards(new Set([...masteredCards, currentCard.id]))
        setNeedsReviewCards(prev => {
          const updated = new Set(prev)
          updated.delete(currentCard.id)
          return updated
        })

        // Reorder deck: move mastered card to the end
        setCardOrder(prevOrder => {
          const newOrder = [...prevOrder]
          const currentCardIndex = newOrder[currentIndex]
          // Remove current card from its position
          newOrder.splice(currentIndex, 1)
          // Add it to the end
          newOrder.push(currentCardIndex)
          return newOrder
        })
      } else {
        setNeedsReviewCards(new Set([...needsReviewCards, currentCard.id]))

        // For review cards, move them forward a few positions (reshuffle)
        setCardOrder(prevOrder => {
          const newOrder = [...prevOrder]
          const currentCardIndex = newOrder[currentIndex]
          // Remove current card from its position
          newOrder.splice(currentIndex, 1)
          // Insert it 3-5 cards ahead (or at the end if fewer cards remain)
          const insertPosition = Math.min(currentIndex + 3, newOrder.length)
          newOrder.splice(insertPosition, 0, currentCardIndex)
          return newOrder
        })
      }

      setCardMasteryLevels(prev => new Map(prev).set(currentCard.id, data.mastery.level))

      // Move to next card automatically (stay at same index since we removed current card)
      setTimeout(() => {
        setFlipped(false)
        // Don't increment index for mastered cards since we removed the current one
        // For review cards, index naturally points to next card
      }, 300)

    } catch (error) {
      console.error('Error updating mastery:', error)
      // Show error to user (could add toast notification here)
    } finally {
      setIsUpdatingMastery(false)
    }
  }, [currentCard.id, currentIndex, masteredCards, needsReviewCards, isUpdatingMastery])

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
    <div className="max-w-4xl mx-auto">
      {/* Header Section - Compact on Mobile */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden mb-3 md:mb-6">
        <div className="p-3 md:p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <BookOpen className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-3xl font-bold text-black dark:text-white mb-0 md:mb-2 truncate">
                Interactive Flashcards
              </h2>
              <p className="hidden md:block text-gray-600 dark:text-gray-400 mb-4">
                Master your material with AI-generated flashcards featuring spaced repetition and progress tracking
              </p>

              {/* Feature Badges - Hidden on Mobile */}
              <div className="hidden md:flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                  AI-Generated
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                  <Zap className="w-3.5 h-3.5 text-accent-primary" />
                  Interactive Learning
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
                  <TrendingUp className="w-3.5 h-3.5 text-accent-primary" />
                  Progress Tracking
                </div>
              </div>
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
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn-secondary flex items-center"
                  style={{
                    gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-2)",
                    fontSize: "var(--font-size-xs)"
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg text-gray-700 dark:text-gray-300"
                    >
                      JSON
                    </button>
                    <button
                      onClick={handleExportHTML}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      HTML
                    </button>
                    <button
                      onClick={handleExportText}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg text-gray-700 dark:text-gray-300"
                    >
                      Text
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-2 md:p-4">
          <div className="mb-2 md:mb-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 md:h-2">
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
            <div className="flex items-center justify-between mt-1 text-xs md:text-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600 dark:text-gray-400">{masteredCount} mastered</span>
                </span>
                <span className="flex items-center gap-1">
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
            className="relative cursor-pointer h-80 md:h-80 lg:h-96 mb-3 md:mb-6"
          >
            {/* Mastery Badge */}
            {masteredCards.has(currentCard.id) && (
              <div className="absolute top-2 right-2 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                <Check className="h-3 w-3" />
                <span>Mastered</span>
              </div>
            )}
            {needsReviewCards.has(currentCard.id) && !masteredCards.has(currentCard.id) && (
              <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                <X className="h-3 w-3" />
                <span>Review</span>
              </div>
            )}

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
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent-secondary/5 to-accent-primary/5 dark:from-accent-secondary/30 dark:to-accent-primary/30 rounded-lg shadow-lg flex items-center justify-center backface-hidden rotate-y-180 border-2 border-accent-secondary/30 dark:border-accent-secondary/50 overflow-y-auto p-3 md:p-4"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <p className="text-sm md:text-base lg:text-lg text-center text-gray-800 dark:text-gray-100 break-words max-w-full leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

          {/* Mastery Buttons - Only show when flipped */}
          {flipped && (
            <div className="flex justify-center items-center gap-3 md:gap-4 mt-4 mb-2">
              <button
                onClick={() => handleMastery('needs-review')}
                disabled={isUpdatingMastery}
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
                <span>Review Again</span>
              </button>

              <button
                onClick={() => handleMastery('mastered')}
                disabled={isUpdatingMastery}
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                <Check className="h-4 w-4 md:h-5 md:w-5" />
                <span>Got it!</span>
              </button>
            </div>
          )}

          <div className="flex justify-center items-center gap-2 md:gap-3">
            <button
              onClick={handlePrevious}
              className="btn-secondary rounded-full p-2"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            <button
              onClick={handleFlip}
              className="btn-primary flex items-center gap-1 px-4 py-2 text-sm md:text-base"
            >
              <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Flip
            </button>

            <button
              onClick={handleNext}
              className="btn-secondary rounded-full p-2"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>

          <p className="hidden md:block text-center text-caption text-gray-500 dark:text-gray-400 mt-2 md:mt-3">
            Press Space to flip • Use arrow keys to navigate
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
    </div>
  )
}