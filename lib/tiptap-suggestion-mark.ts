import { Mark, mergeAttributes } from '@tiptap/core'

export interface SuggestionMarkAttributes {
  suggestionId: string
  category: 'grammar' | 'style' | 'clarity' | 'structure' | 'citation' | 'enhancement'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    suggestionMark: {
      setSuggestionMark: (attributes: SuggestionMarkAttributes) => ReturnType
      unsetSuggestionMark: (suggestionId: string) => ReturnType
    }
  }
}

const categoryColors = {
  grammar: 'rgb(239 68 68)', // red-500
  style: 'rgb(59 130 246)', // blue-500
  clarity: 'rgb(249 115 22)', // orange-500
  structure: 'rgb(234 179 8)', // yellow-500
  citation: 'rgb(168 85 247)', // purple-500
  enhancement: 'rgb(34 197 94)' // green-500
}

export const SuggestionMark = Mark.create({
  name: 'suggestionMark',

  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: element => element.getAttribute('data-suggestion-id'),
        renderHTML: attributes => {
          if (!attributes.suggestionId) {
            return {}
          }
          return {
            'data-suggestion-id': attributes.suggestionId
          }
        }
      },
      category: {
        default: 'style',
        parseHTML: element => element.getAttribute('data-category'),
        renderHTML: attributes => {
          if (!attributes.category) {
            return {}
          }
          return {
            'data-category': attributes.category
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-suggestion-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const category = HTMLAttributes['data-category'] || 'style'
    const color = categoryColors[category as keyof typeof categoryColors] || categoryColors.style

    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        class: 'suggestion-highlight',
        style: `
          background-color: ${color}15;
          border-bottom: 2px solid ${color};
          border-radius: 2px;
          cursor: pointer;
          transition: background-color 0.2s;
        `,
        'data-suggestion-id': HTMLAttributes['data-suggestion-id'],
        'data-category': HTMLAttributes['data-category']
      }),
      0
    ]
  },

  addCommands() {
    return {
      setSuggestionMark:
        (attributes: SuggestionMarkAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetSuggestionMark:
        (suggestionId: string) =>
        ({ state, tr }) => {
          const { doc } = state
          let removed = false

          doc.descendants((node, pos) => {
            if (node.marks) {
              node.marks.forEach(mark => {
                if (
                  mark.type.name === this.name &&
                  mark.attrs.suggestionId === suggestionId
                ) {
                  tr.removeMark(
                    pos,
                    pos + node.nodeSize,
                    mark.type
                  )
                  removed = true
                }
              })
            }
          })

          if (removed) {
            tr.setMeta('addToHistory', true)
            return true
          }

          return false
        }
    }
  }
})
