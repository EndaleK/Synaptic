/**
 * Readability Scoring Utilities
 * Implements Flesch-Kincaid Reading Ease and Grade Level
 * Plus academic level detection and complexity analysis
 */

export interface ReadabilityScores {
  fleschReadingEase: number // 0-100, higher = easier
  fleschKincaidGrade: number // US grade level
  academicLevel: 'high_school' | 'undergraduate' | 'graduate' | 'professional'
  averageSentenceLength: number
  averageWordLength: number
  complexWordPercentage: number
  readabilityAssessment: string
  recommendations: string[]
}

/**
 * Count syllables in a word using simple heuristics
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim()
  if (word.length <= 3) return 1

  // Remove silent e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]{1,2}/g)
  let syllables = vowelGroups ? vowelGroups.length : 1

  // Adjust for special cases
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    syllables++
  }

  return Math.max(1, syllables)
}

/**
 * Split text into sentences
 */
function splitSentences(text: string): string[] {
  // Handle common abbreviations
  text = text.replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|etc|vs|i\.e|e\.g)\./g, '$1<DOT>')

  // Split on sentence terminators
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.replace(/<DOT>/g, '.').trim())
    .filter(s => s.length > 0)

  return sentences
}

/**
 * Split text into words (excluding punctuation)
 */
function splitWords(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
}

/**
 * Determine if a word is "complex" (3+ syllables)
 */
function isComplexWord(word: string): boolean {
  return countSyllables(word) >= 3
}

/**
 * Calculate Flesch Reading Ease Score
 * Formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
 * Score interpretation:
 * 90-100: Very Easy (5th grade)
 * 80-90: Easy (6th grade)
 * 70-80: Fairly Easy (7th grade)
 * 60-70: Standard (8th-9th grade)
 * 50-60: Fairly Difficult (10th-12th grade)
 * 30-50: Difficult (College)
 * 0-30: Very Confusing (College graduate)
 */
function calculateFleschReadingEase(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0

  const avgWordsPerSentence = totalWords / totalSentences
  const avgSyllablesPerWord = totalSyllables / totalWords

  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
 */
function calculateFleschKincaidGrade(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0

  const avgWordsPerSentence = totalWords / totalSentences
  const avgSyllablesPerWord = totalSyllables / totalWords

  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59

  return Math.max(0, Math.round(grade * 10) / 10)
}

/**
 * Determine academic level based on grade level and complexity
 */
function determineAcademicLevel(
  gradeLevel: number,
  complexWordPercentage: number
): 'high_school' | 'undergraduate' | 'graduate' | 'professional' {
  if (gradeLevel < 12 && complexWordPercentage < 15) {
    return 'high_school'
  } else if (gradeLevel >= 12 && gradeLevel < 16 && complexWordPercentage < 25) {
    return 'undergraduate'
  } else if (gradeLevel >= 16 || complexWordPercentage >= 25) {
    return 'graduate'
  } else if (complexWordPercentage >= 35) {
    return 'professional'
  }

  return 'undergraduate' // default
}

/**
 * Get readability assessment text based on Flesch Reading Ease score
 */
function getReadabilityAssessment(score: number): string {
  if (score >= 90) return 'Very Easy to read. Suitable for 5th grade students.'
  if (score >= 80) return 'Easy to read. Conversational English for average 6th grader.'
  if (score >= 70) return 'Fairly Easy to read. Suitable for 7th grade students.'
  if (score >= 60) return 'Standard. Easily understood by 8th-9th grade students.'
  if (score >= 50) return 'Fairly Difficult. Suitable for 10th-12th grade students.'
  if (score >= 30) return 'Difficult. Best understood by college students.'
  return 'Very Confusing. Best understood by college graduates.'
}

/**
 * Generate recommendations based on readability scores
 */
function generateRecommendations(scores: Partial<ReadabilityScores>): string[] {
  const recommendations: string[] = []

  if (scores.fleschReadingEase !== undefined && scores.fleschReadingEase < 50) {
    recommendations.push('Consider simplifying sentence structure and using shorter sentences.')
  }

  if (scores.averageSentenceLength !== undefined && scores.averageSentenceLength > 25) {
    recommendations.push('Average sentence length is high. Try breaking up longer sentences.')
  }

  if (scores.complexWordPercentage !== undefined && scores.complexWordPercentage > 30) {
    recommendations.push('High percentage of complex words. Consider using simpler alternatives where appropriate.')
  }

  if (scores.averageWordLength !== undefined && scores.averageWordLength > 5.5) {
    recommendations.push('Words are fairly long on average. Look for opportunities to use shorter synonyms.')
  }

  if (scores.fleschKincaidGrade !== undefined && scores.fleschKincaidGrade > 16) {
    recommendations.push('Reading level is quite advanced. Ensure this matches your target audience.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Readability is good! Your writing is clear and accessible.')
  }

  return recommendations
}

/**
 * Calculate comprehensive readability scores for given text
 */
export function calculateReadability(text: string): ReadabilityScores {
  if (!text || text.trim().length === 0) {
    return {
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      academicLevel: 'high_school',
      averageSentenceLength: 0,
      averageWordLength: 0,
      complexWordPercentage: 0,
      readabilityAssessment: 'No content to analyze',
      recommendations: ['Add more content to analyze readability']
    }
  }

  const sentences = splitSentences(text)
  const words = splitWords(text)
  const totalSentences = sentences.length
  const totalWords = words.length

  if (totalWords < 5 || totalSentences === 0) {
    return {
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      academicLevel: 'high_school',
      averageSentenceLength: totalWords,
      averageWordLength: 0,
      complexWordPercentage: 0,
      readabilityAssessment: 'Content too short for accurate analysis',
      recommendations: ['Write at least 3-4 sentences for meaningful readability analysis']
    }
  }

  // Calculate syllables and identify complex words
  let totalSyllables = 0
  let complexWords = 0
  let totalCharacters = 0

  words.forEach(word => {
    const syllables = countSyllables(word)
    totalSyllables += syllables
    totalCharacters += word.length

    if (isComplexWord(word)) {
      complexWords++
    }
  })

  const averageSentenceLength = Math.round((totalWords / totalSentences) * 10) / 10
  const averageWordLength = Math.round((totalCharacters / totalWords) * 10) / 10
  const complexWordPercentage = Math.round((complexWords / totalWords) * 100 * 10) / 10

  const fleschReadingEase = Math.round(calculateFleschReadingEase(totalWords, totalSentences, totalSyllables) * 10) / 10
  const fleschKincaidGrade = calculateFleschKincaidGrade(totalWords, totalSentences, totalSyllables)
  const academicLevel = determineAcademicLevel(fleschKincaidGrade, complexWordPercentage)

  const scores: ReadabilityScores = {
    fleschReadingEase,
    fleschKincaidGrade,
    academicLevel,
    averageSentenceLength,
    averageWordLength,
    complexWordPercentage,
    readabilityAssessment: getReadabilityAssessment(fleschReadingEase),
    recommendations: []
  }

  scores.recommendations = generateRecommendations(scores)

  return scores
}
