"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Download, Home, ChevronDown, RefreshCw, BookOpen, Sparkles, Zap, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Flashcard } from "@/lib/types"
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

  const currentCard = flashcards[currentIndex]
  const progress = ((studiedCards.size / flashcards.length) * 100).toFixed(0)

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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flashcards - ${dateStr}</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
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
            margin-bottom: 30px;
            font-size: 0.9em;
        }
        .flashcard-container {
            perspective: 1000px;
            margin: 30px 0;
        }
        .flashcard {
            width: 100%;
            height: 300px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.6s;
            cursor: pointer;
            margin: 0 auto;
        }
        .flashcard.flipped {
            transform: rotateY(180deg);
        }
        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            border: 2px solid #e2e8f0;
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
            font-size: 1.3em;
            line-height: 1.5;
            text-align: center;
            word-wrap: break-word;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
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
        }
        .nav-button:hover {
            background: #3182ce;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(66, 153, 225, 0.4);
        }
        .nav-button:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .card-counter {
            color: #4a5568;
            font-weight: 600;
            font-size: 1.1em;
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
        @media (max-width: 600px) {
            body { padding: 10px; }
            .flashcard-app { padding: 20px; }
            .flashcard { height: 250px; }
            .card-content { font-size: 1.1em; }
        }
    </style>
</head>
<body>
    <div class="flashcard-app">
        <h1>📚 Interactive Flashcards</h1>
        <div class="metadata">
            Generated on ${new Date().toLocaleDateString()} • ${flashcards.length} cards
        </div>
        
        <div class="flashcard-container">
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
        
        <div class="flip-hint">Click the card to flip it!</div>
        
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
    </div>

    <script>
        const flashcards = ${JSON.stringify(flashcards.map(card => ({ front: escapeHtml(card.front), back: escapeHtml(card.back) })))};
        let currentIndex = 0;
        let isFlipped = false;

        function updateCard() {
            const frontContent = document.getElementById('front-content');
            const backContent = document.getElementById('back-content');
            const currentCardSpan = document.getElementById('current-card');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            
            if (flashcards[currentIndex]) {
                frontContent.innerHTML = flashcards[currentIndex].front;
                backContent.innerHTML = flashcards[currentIndex].back;
            }
            
            currentCardSpan.textContent = currentIndex + 1;
            
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === flashcards.length - 1;
            
            // Reset flip state when changing cards
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.remove('flipped');
            isFlipped = false;
        }

        function flipCard() {
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.toggle('flipped');
            isFlipped = !isFlipped;
        }

        function nextCard() {
            if (currentIndex < flashcards.length - 1) {
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
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden mb-6">
        <div className="p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/20 dark:to-accent-secondary/20">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-black dark:text-white mb-2">
                Interactive Flashcards
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Master your material with AI-generated flashcards featuring spaced repetition and progress tracking
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-2">
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
        <div
          className="border-b border-gray-200 dark:border-gray-700"
          style={{ padding: "var(--space-4)" }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
              <button
                onClick={onReset}
                className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors text-body-sm"
                style={{ gap: "var(--space-1)" }}
              >
                <Home className="h-4 w-4" />
                Back to Upload
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center text-accent-primary hover:text-accent-secondary transition-colors text-body-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ gap: "var(--space-1)" }}
                  title="Generate different flashcards from the same content"
                >
                  <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
                  {isRegenerating ? "Regenerating..." : "Regenerate"}
                </button>
              )}
            </div>
            <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
              <span className="text-caption text-gray-600 dark:text-gray-400">
                Card {currentIndex + 1} of {flashcards.length}
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

        <div style={{ padding: "var(--space-4)" }}>
          <div style={{ marginBottom: "var(--space-3)" }}>
            <div
              className="w-full bg-accent-primary/10 dark:bg-accent-primary/20 rounded-full"
              style={{ height: "8px" }}
            >
              <div
                className="bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  height: "8px"
                }}
              />
            </div>
            <p className="text-caption text-gray-600 dark:text-gray-400" style={{ marginTop: "var(--space-1)" }}>
              Progress: {studiedCards.size}/{flashcards.length} cards studied ({progress}%)
            </p>
          </div>

          <div 
            className="relative cursor-pointer"
            style={{ 
              height: "24rem",
              marginBottom: "var(--space-6)"
            }}
          >
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
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 dark:from-accent-primary/20 dark:to-accent-secondary/20 rounded-lg shadow-lg flex items-center justify-center backface-hidden border-2 border-accent-primary/30 dark:border-accent-primary/50"
                style={{
                  backfaceVisibility: "hidden",
                  padding: "var(--space-6)",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <p className="text-display-sm text-center text-gray-800 dark:text-gray-100">
                  {currentCard.front}
                </p>
              </div>
              
              <div
                className="absolute inset-0 w-full h-full bg-gradient-to-br from-accent-secondary/5 to-accent-primary/5 dark:from-accent-secondary/30 dark:to-accent-primary/30 rounded-lg shadow-lg flex items-center justify-center backface-hidden rotate-y-180 border-2 border-accent-secondary/30 dark:border-accent-secondary/50"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  padding: "var(--space-6)",
                  borderRadius: "var(--radius-lg)"
                }}
              >
                <p className="text-heading-lg text-center text-gray-800 dark:text-gray-100">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center" style={{ gap: "var(--space-3)" }}>
            <button
              onClick={handlePrevious}
              className="btn-secondary rounded-full"
              style={{ 
                padding: "var(--space-2)",
                borderRadius: "50%"
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleFlip}
              className="btn-primary flex items-center"
              style={{ gap: "var(--space-1)" }}
            >
              <RotateCcw className="h-4 w-4" />
              Flip Card
            </button>
            
            <button
              onClick={handleNext}
              className="btn-secondary rounded-full"
              style={{ 
                padding: "var(--space-2)",
                borderRadius: "50%"
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <p className="text-center text-caption text-gray-500 dark:text-gray-400" style={{ marginTop: "var(--space-3)" }}>
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