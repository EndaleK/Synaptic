/**
 * Prompt Injection Detection
 *
 * Detects and blocks common prompt injection patterns that attempt to:
 * - Override system instructions
 * - Extract system prompts
 * - Manipulate AI behavior
 * - Bypass safety controls
 */

export interface InjectionDetectionResult {
  isSafe: boolean
  reason?: string
  severity?: 'low' | 'medium' | 'high'
  patterns?: string[]
}

/**
 * Suspicious patterns that indicate prompt injection attempts
 */
const INJECTION_PATTERNS = [
  // System instruction override attempts
  /ignore\s+(previous|all|above)\s+instructions?/i,
  /forget\s+(everything|all|previous|above)/i,
  /disregard\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /you\s+are\s+now\s+(in\s+)?(admin|developer|god|root)\s+mode/i,
  /override\s+(system|safety|content)\s+(prompt|instructions?|policy)/i,

  // System prompt extraction attempts
  /show\s+(me\s+)?(your|the)\s+system\s+(prompt|instructions?)/i,
  /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions?|rules)/i,
  /reveal\s+(your|the)\s+(prompt|instructions?|system)/i,
  /print\s+(your|the)\s+system/i,
  /output\s+(your|the)\s+system/i,

  // Role manipulation
  /you\s+are\s+no\s+longer\s+a/i,
  /pretend\s+you\s+(are|were)\s+(not|never)/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+(not|jailbroken|unrestricted)/i,
  /from\s+now\s+on,?\s+you\s+(will|should|must|are)/i,

  // Delimiter/encoding bypass attempts
  /```\s*(system|assistant|user)\s*:/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,

  // DAN (Do Anything Now) and jailbreak attempts
  /DAN\s+mode/i,
  /jailbreak/i,
  /unrestricted\s+mode/i,
  /developer\s+mode\s+(enabled|activated)/i,

  // Instruction injection markers
  /new\s+instructions?:/i,
  /system\s+update:/i,
  /admin\s+override:/i,
]

/**
 * High-severity patterns that should always be blocked
 */
const HIGH_SEVERITY_PATTERNS = [
  /ignore\s+previous\s+instructions?/i,
  /you\s+are\s+now\s+in\s+admin\s+mode/i,
  /jailbreak/i,
  /DAN\s+mode/i,
]

/**
 * Maximum allowed occurrences of common instruction words
 * (to catch subtle injection attempts)
 */
const INSTRUCTION_WORD_LIMITS = {
  'ignore': 2,
  'forget': 2,
  'disregard': 2,
  'override': 2,
  'system': 3,
  'instruction': 3,
  'prompt': 3,
}

/**
 * Detect potential prompt injection in user input
 */
export function detectPromptInjection(input: string): InjectionDetectionResult {
  const lowerInput = input.toLowerCase()
  const detectedPatterns: string[] = []

  // Check for high-severity patterns first
  for (const pattern of HIGH_SEVERITY_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        reason: 'Potential prompt injection detected: attempting to override system behavior',
        severity: 'high',
        patterns: [pattern.toString()]
      }
    }
  }

  // Check for general injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.toString())
    }
  }

  if (detectedPatterns.length >= 2) {
    // Multiple patterns = likely injection attempt
    return {
      isSafe: false,
      reason: 'Multiple suspicious patterns detected in message',
      severity: 'high',
      patterns: detectedPatterns
    }
  } else if (detectedPatterns.length === 1) {
    // Single pattern = possible injection, medium severity
    return {
      isSafe: false,
      reason: 'Suspicious pattern detected in message',
      severity: 'medium',
      patterns: detectedPatterns
    }
  }

  // Check for excessive use of instruction keywords
  for (const [word, limit] of Object.entries(INSTRUCTION_WORD_LIMITS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = input.match(regex)
    if (matches && matches.length > limit) {
      return {
        isSafe: false,
        reason: `Excessive use of instruction keyword: "${word}" (${matches.length} times)`,
        severity: 'low',
        patterns: [word]
      }
    }
  }

  // Check for suspicious character sequences (encoded payloads)
  const suspiciousEncodings = [
    /base64,/i,
    /\\x[0-9a-f]{2}/i,  // Hex encoding
    /\\u[0-9a-f]{4}/i,  // Unicode escapes
    /%[0-9a-f]{2}/i,    // URL encoding
  ]

  for (const pattern of suspiciousEncodings) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        reason: 'Suspicious encoding detected (potential obfuscated injection)',
        severity: 'medium',
        patterns: [pattern.toString()]
      }
    }
  }

  // Check for abnormally long messages without proper punctuation
  // (often a sign of copy-pasted jailbreak prompts)
  if (input.length > 1000) {
    const sentences = input.split(/[.!?]/).filter(s => s.trim().length > 0)
    const avgSentenceLength = input.length / sentences.length

    if (avgSentenceLength > 500) {
      return {
        isSafe: false,
        reason: 'Abnormally long message without proper structure',
        severity: 'low',
        patterns: ['long_unstructured_text']
      }
    }
  }

  return {
    isSafe: true
  }
}

/**
 * Sanitize user input by removing potential injection markers
 * (use as fallback, not primary defense)
 */
export function sanitizeInput(input: string): string {
  return input
    // Remove special tokens/delimiters
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/```system/gi, '```text')
    .replace(/```assistant/gi, '```text')
    // Trim excessive whitespace
    .replace(/\s{3,}/g, ' ')
    .trim()
}

/**
 * Validate message length
 */
export function validateMessageLength(
  message: string,
  maxLength: number = 5000
): { isValid: boolean; reason?: string } {
  if (message.length === 0) {
    return {
      isValid: false,
      reason: 'Message cannot be empty'
    }
  }

  if (message.length > maxLength) {
    return {
      isValid: false,
      reason: `Message too long (${message.length} characters, max ${maxLength})`
    }
  }

  return { isValid: true }
}
