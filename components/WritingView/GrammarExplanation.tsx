"use client"

import { BookOpen, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { WritingSuggestion } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface GrammarExplanationProps {
  suggestion: WritingSuggestion
  onLearnMore?: () => void
}

// Grammar rule explanations database
const GRAMMAR_EXPLANATIONS: Record<string, {
  rule: string
  explanation: string
  example: string
  tip: string
}> = {
  'subject-verb-agreement': {
    rule: 'Subject-Verb Agreement',
    explanation: 'The verb must agree in number with its subject. Singular subjects take singular verbs, and plural subjects take plural verbs.',
    example: 'The student writes (singular) vs. The students write (plural)',
    tip: 'Identify the main subject and make sure the verb matches its number.'
  },
  'comma-splice': {
    rule: 'Comma Splice',
    explanation: 'A comma splice occurs when two independent clauses are joined with only a comma. Use a semicolon, a comma with a coordinating conjunction, or separate sentences.',
    example: 'Wrong: I love writing, it helps me think. Right: I love writing; it helps me think.',
    tip: 'If each part could be a sentence on its own, you need more than a comma to connect them.'
  },
  'passive-voice': {
    rule: 'Passive Voice',
    explanation: 'Passive voice can make writing less clear and engaging. Active voice (subject performs action) is usually stronger than passive voice (subject receives action).',
    example: 'Passive: The essay was written by me. Active: I wrote the essay.',
    tip: 'Ask yourself: who is doing what? Put the doer (subject) first for clearer writing.'
  },
  'pronoun-reference': {
    rule: 'Pronoun Reference',
    explanation: 'Pronouns must clearly refer to a specific noun (antecedent). Ambiguous pronouns confuse readers.',
    example: 'Unclear: When John met Bob, he smiled. Clear: When John met Bob, John smiled.',
    tip: 'Make sure every pronoun has a clear antecedent. If ambiguous, use the noun instead.'
  },
  'sentence-fragment': {
    rule: 'Sentence Fragment',
    explanation: 'A complete sentence needs a subject and a verb and expresses a complete thought. A fragment is missing one of these.',
    example: 'Fragment: Because I was tired. Complete: I went to bed because I was tired.',
    tip: 'Read the sentence alone. Does it stand on its own? If not, it's a fragment.'
  },
  'wordiness': {
    rule: 'Wordiness / Conciseness',
    explanation: 'Using more words than necessary can weaken your writing. Say the same thing more concisely.',
    example: 'Wordy: Due to the fact that... Concise: Because...',
    tip: 'Cut unnecessary words. If you can remove a word without changing meaning, do it.'
  },
  'run-on-sentence': {
    rule: 'Run-on Sentence',
    explanation: 'A run-on sentence joins two or more independent clauses without proper punctuation or conjunctions.',
    example: 'Run-on: I love writing I do it every day. Fixed: I love writing. I do it every day.',
    tip: 'If you have multiple complete thoughts, separate them properly with periods, semicolons, or conjunctions.'
  },
  'apostrophe-misuse': {
    rule: 'Apostrophe Usage',
    explanation: 'Apostrophes show possession (Mary\'s book) or contractions (it\'s = it is). They don\'t make words plural.',
    example: 'Wrong: Apple\'s are healthy. Right: Apples are healthy. / Right: Mary\'s apple is healthy.',
    tip: 'Ask: Is this showing ownership or a contraction? If neither, no apostrophe.'
  }
}

export default function GrammarExplanation({ suggestion, onLearnMore }: GrammarExplanationProps) {
  // Try to match suggestion category to a grammar rule
  const ruleKey = suggestion.category?.toLowerCase().replace(/\s+/g, '-') || 'general'
  const explanation = GRAMMAR_EXPLANATIONS[ruleKey]

  const getSeverityInfo = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Critical Error'
        }
      case 'medium':
        return {
          icon: Lightbulb,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          label: 'Suggestion'
        }
      default:
        return {
          icon: CheckCircle2,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'Style Improvement'
        }
    }
  }

  const severityInfo = getSeverityInfo(suggestion.severity)
  const Icon = severityInfo.icon

  return (
    <div className={cn(
      "rounded-lg border-2 p-4 space-y-3",
      severityInfo.bgColor,
      severityInfo.borderColor
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", severityInfo.bgColor)}>
          <Icon className={cn("w-5 h-5", severityInfo.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn("font-semibold", severityInfo.color)}>
              {suggestion.category || 'Writing Suggestion'}
            </h4>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              severityInfo.bgColor,
              severityInfo.color
            )}>
              {severityInfo.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {suggestion.suggestion || 'Consider revising this section.'}
          </p>
        </div>
      </div>

      {/* Grammar Rule Explanation */}
      {explanation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h5 className="font-medium text-sm text-purple-900 dark:text-purple-100">
              Understanding {explanation.rule}
            </h5>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {explanation.explanation}
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 border-l-4 border-purple-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Example:</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
              {explanation.example}
            </p>
          </div>

          <div className={cn("flex items-start gap-2 p-2 rounded", "bg-amber-50 dark:bg-amber-900/20")}>
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Tip:</strong> {explanation.tip}
            </p>
          </div>
        </div>
      )}

      {/* Why This Matters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <h5 className="font-medium text-sm text-gray-900 dark:text-white mb-1.5">
          Why This Matters
        </h5>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {suggestion.severity === 'high' || suggestion.severity === 'critical'
            ? 'This error can significantly impact clarity and may confuse readers. Addressing it will make your writing more professional and easier to understand.'
            : suggestion.severity === 'medium'
            ? 'Improving this will make your writing clearer and more engaging for readers. It\'s not critical, but addressing it will strengthen your essay.'
            : 'This is a style suggestion that can enhance readability and flow. It\'s a good practice that professional writers follow.'}
        </p>
      </div>

      {/* Learn More Button */}
      {onLearnMore && (
        <button
          onClick={onLearnMore}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Learn More About This Rule
        </button>
      )}
    </div>
  )
}
