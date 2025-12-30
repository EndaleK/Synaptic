/**
 * Motivation Messages System
 *
 * Friendly buddy messages for different study contexts:
 * - Greeting messages (session start)
 * - Encouragement (after completing tasks)
 * - Gentle nudges (idle/inactive)
 * - Achievement celebrations
 *
 * Tone: Casual, peer-like, encouraging without being pushy
 */

export type MotivationCategory =
  | 'greeting'
  | 'encouragement'
  | 'nudge'
  | 'achievement'
  | 'streak'
  | 'milestone'

export interface MotivationMessage {
  category: MotivationCategory
  message: string
  emoji: string
  subtext?: string
}

// Time-of-day aware greetings
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// Greeting messages by time of day
const greetingMessages: Record<ReturnType<typeof getTimeOfDay>, MotivationMessage[]> = {
  morning: [
    { category: 'greeting', message: "Good morning! Ready to crush it today?", emoji: '☀️', subtext: "Early bird gets the knowledge" },
    { category: 'greeting', message: "Morning! Let's start the day with some learning", emoji: '🌅', subtext: "Fresh mind, fresh start" },
    { category: 'greeting', message: "Rise and shine! What shall we learn today?", emoji: '✨', subtext: "The best time to learn is now" },
  ],
  afternoon: [
    { category: 'greeting', message: "Hey! Perfect time for a study session", emoji: '🚀', subtext: "Let's make progress together" },
    { category: 'greeting', message: "Afternoon check-in! Ready to learn something new?", emoji: '📚', subtext: "Every session counts" },
    { category: 'greeting', message: "Hey there! Let's keep that momentum going", emoji: '💪', subtext: "You're doing great" },
  ],
  evening: [
    { category: 'greeting', message: "Evening study session? I like your dedication!", emoji: '🌟', subtext: "Consistency is key" },
    { category: 'greeting', message: "Hey! Wind down with some learning?", emoji: '🌙', subtext: "Relaxed mind absorbs more" },
    { category: 'greeting', message: "Good evening! Let's make it count", emoji: '✨', subtext: "Quality over quantity" },
  ],
  night: [
    { category: 'greeting', message: "Burning the midnight oil? Let's make it worth it!", emoji: '🦉', subtext: "Night owl mode activated" },
    { category: 'greeting', message: "Late night learning! You've got this", emoji: '🌃', subtext: "Don't stay up too late though!" },
    { category: 'greeting', message: "Still going strong! Impressive dedication", emoji: '⭐', subtext: "Remember to rest too" },
  ],
}

// Encouragement messages after completing tasks
const encouragementMessages: MotivationMessage[] = [
  { category: 'encouragement', message: "Nice work! You just knocked out some cards", emoji: '💪' },
  { category: 'encouragement', message: "Great session! Your future self thanks you", emoji: '🎯' },
  { category: 'encouragement', message: "Awesome! Keep that momentum rolling", emoji: '🔥' },
  { category: 'encouragement', message: "You're on a roll! Keep it up", emoji: '⚡' },
  { category: 'encouragement', message: "Solid progress! Every card counts", emoji: '📈' },
  { category: 'encouragement', message: "That's the spirit! Learning is happening", emoji: '🧠' },
  { category: 'encouragement', message: "Boom! Another successful session", emoji: '💥' },
  { category: 'encouragement', message: "You're making it look easy!", emoji: '😎' },
]

// Gentle nudge messages for idle users
const nudgeMessages: MotivationMessage[] = [
  { category: 'nudge', message: "Still there? Quick 5-minute review?", emoji: '👋' },
  { category: 'nudge', message: "Ready to pick up where we left off?", emoji: '📖' },
  { category: 'nudge', message: "A few flashcards can go a long way!", emoji: '✨' },
  { category: 'nudge', message: "Small sessions add up. Want to continue?", emoji: '🎯' },
  { category: 'nudge', message: "Your cards miss you! Quick review?", emoji: '💚' },
]

// Achievement celebration messages
const achievementMessages: Record<string, MotivationMessage[]> = {
  cards_reviewed: [
    { category: 'achievement', message: "10 cards reviewed! You're warming up", emoji: '🌱' },
    { category: 'achievement', message: "25 cards down! Nice focus session", emoji: '⭐' },
    { category: 'achievement', message: "50 cards! You're on fire today", emoji: '🔥' },
    { category: 'achievement', message: "100 cards! Absolutely crushing it", emoji: '🏆' },
  ],
  cards_mastered: [
    { category: 'achievement', message: "First card mastered! Many more to come", emoji: '🎯' },
    { category: 'achievement', message: "10 cards mastered! Building solid knowledge", emoji: '💪' },
    { category: 'achievement', message: "50 cards mastered! You're becoming an expert", emoji: '🧠' },
    { category: 'achievement', message: "100 cards mastered! That's real progress", emoji: '🏅' },
  ],
  documents_completed: [
    { category: 'achievement', message: "First document completed! Great start", emoji: '📄' },
    { category: 'achievement', message: "5 documents done! You're building a knowledge base", emoji: '📚' },
  ],
}

// Streak milestone messages
const streakMessages: MotivationMessage[] = [
  { category: 'streak', message: "3-day streak! You're building a habit", emoji: '🔥', subtext: "Keep it going!" },
  { category: 'streak', message: "7-day streak! One week strong", emoji: '🔥🔥', subtext: "You're unstoppable" },
  { category: 'streak', message: "14-day streak! Two weeks of dedication", emoji: '🔥🔥🔥', subtext: "This is commitment" },
  { category: 'streak', message: "30-day streak! One month champion", emoji: '🏆', subtext: "Incredible dedication!" },
  { category: 'streak', message: "100-day streak! You're a legend", emoji: '👑', subtext: "Beyond impressive" },
]

/**
 * Get a random greeting message based on time of day
 */
export function getGreetingMessage(): MotivationMessage {
  const timeOfDay = getTimeOfDay()
  const messages = greetingMessages[timeOfDay]
  return messages[Math.floor(Math.random() * messages.length)]
}

/**
 * Get a random encouragement message
 */
export function getEncouragementMessage(): MotivationMessage {
  return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)]
}

/**
 * Get a random nudge message
 */
export function getNudgeMessage(): MotivationMessage {
  return nudgeMessages[Math.floor(Math.random() * nudgeMessages.length)]
}

/**
 * Get an achievement message based on type and count
 */
export function getAchievementMessage(
  type: 'cards_reviewed' | 'cards_mastered' | 'documents_completed',
  count: number
): MotivationMessage | null {
  const messages = achievementMessages[type]
  if (!messages) return null

  // Find the appropriate milestone
  const thresholds = type === 'cards_reviewed'
    ? [10, 25, 50, 100]
    : type === 'cards_mastered'
    ? [1, 10, 50, 100]
    : [1, 5]

  const index = thresholds.findIndex(t => count === t)
  if (index === -1) return null

  return messages[index] || null
}

/**
 * Get a streak milestone message
 */
export function getStreakMessage(streakDays: number): MotivationMessage | null {
  const thresholds = [3, 7, 14, 30, 100]
  const index = thresholds.findIndex(t => streakDays === t)
  if (index === -1) return null
  return streakMessages[index] || null
}

/**
 * Get a personalized message based on context
 */
export function getContextualMessage(context: {
  isFirstVisitToday?: boolean
  cardsReviewed?: number
  streakDays?: number
  isIdle?: boolean
}): MotivationMessage {
  const { isFirstVisitToday, cardsReviewed, streakDays, isIdle } = context

  // Priority: Streak milestones > First visit greeting > Achievement > Idle nudge
  if (streakDays) {
    const streakMsg = getStreakMessage(streakDays)
    if (streakMsg) return streakMsg
  }

  if (isFirstVisitToday) {
    return getGreetingMessage()
  }

  if (cardsReviewed) {
    const achieveMsg = getAchievementMessage('cards_reviewed', cardsReviewed)
    if (achieveMsg) return achieveMsg
  }

  if (isIdle) {
    return getNudgeMessage()
  }

  // Default: encouragement
  return getEncouragementMessage()
}

/**
 * Format a motivation message for display
 */
export function formatMotivationMessage(msg: MotivationMessage): string {
  return `${msg.emoji} ${msg.message}${msg.subtext ? `\n${msg.subtext}` : ''}`
}
