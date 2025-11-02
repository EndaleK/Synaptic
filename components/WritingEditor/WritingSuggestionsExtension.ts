/**
 * TipTap Extension for Writing Suggestions
 * Renders inline decorations (underlines, highlights) for grammar, spelling, and style issues
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { WritingSuggestion } from '@/lib/supabase/types'

export interface WritingSuggestionsOptions {
  suggestions: WritingSuggestion[]
  onSuggestionClick?: (suggestion: WritingSuggestion) => void
}

export const WritingSuggestionsExtension = Extension.create<WritingSuggestionsOptions>({
  name: 'writingSuggestions',

  addOptions() {
    return {
      suggestions: [],
      onSuggestionClick: undefined
    }
  },

  addProseMirrorPlugins() {
    const { suggestions, onSuggestionClick } = this.options

    return [
      new Plugin({
        key: new PluginKey('writingSuggestions'),

        state: {
          init() {
            return DecorationSet.empty
          },

          apply(tr, decorationSet) {
            // Map decorations through document changes
            return decorationSet.map(tr.mapping, tr.doc)
          }
        },

        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            const doc = state.doc

            suggestions.forEach((suggestion) => {
              const { start_position, end_position, type, severity, id } = suggestion

              // Validate positions
              if (start_position < 0 || end_position > doc.content.size) {
                return
              }

              // Determine decoration class based on type and severity
              const className = getDecorationClass(type, severity)

              // Create inline decoration
              const decoration = Decoration.inline(
                start_position,
                end_position,
                {
                  class: className,
                  'data-suggestion-id': id,
                  'data-suggestion-type': type,
                  'data-suggestion-severity': severity
                },
                {
                  // Decoration spec for additional metadata
                  suggestion
                }
              )

              decorations.push(decoration)
            })

            return DecorationSet.create(doc, decorations)
          },

          handleClick(view, pos, event) {
            // Check if click was on a suggestion decoration
            const target = event.target as HTMLElement
            const suggestionId = target.getAttribute('data-suggestion-id')

            if (suggestionId && onSuggestionClick) {
              const suggestion = suggestions.find(s => s.id === suggestionId)
              if (suggestion) {
                onSuggestionClick(suggestion)
                return true
              }
            }

            return false
          }
        }
      })
    ]
  }
})

/**
 * Get CSS class for decoration based on type and severity
 */
function getDecorationClass(
  type: WritingSuggestion['type'],
  severity: WritingSuggestion['severity']
): string {
  const baseClass = 'writing-suggestion'

  // Type-specific classes
  const typeClasses: Record<WritingSuggestion['type'], string> = {
    grammar: 'grammar-issue',
    spelling: 'spelling-issue',
    structure: 'structure-issue',
    tone: 'tone-issue',
    citation: 'citation-issue',
    clarity: 'clarity-issue'
  }

  // Severity-specific classes
  const severityClasses: Record<WritingSuggestion['severity'], string> = {
    error: 'severity-error',
    warning: 'severity-warning',
    suggestion: 'severity-suggestion'
  }

  return `${baseClass} ${typeClasses[type]} ${severityClasses[severity]}`
}
