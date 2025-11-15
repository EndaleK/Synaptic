"use client"

import { useEffect, useState } from 'react'
import { Users, Circle, Share2, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CollaboratorPresence {
  user_id: string
  user_name: string
  user_color: string
  cursor_position: number | null
  last_active: string
}

interface CollaborativeEditingProps {
  essayId: string
  currentUserId: string
  currentUserName: string
  onCollaboratorUpdate?: (collaborators: CollaboratorPresence[]) => void
}

const COLLABORATOR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1'  // indigo
]

export default function CollaborativeEditing({
  essayId,
  currentUserId,
  currentUserName,
  onCollaboratorUpdate
}: CollaborativeEditingProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([])
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Generate share link
    const origin = window.location.origin
    setShareLink(`${origin}/writing/${essayId}`)

    // Subscribe to presence channel
    const channel = supabase.channel(`essay:${essayId}:presence`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeCollaborators: CollaboratorPresence[] = []

        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== currentUserId) {
              activeCollaborators.push(presence)
            }
          })
        })

        setCollaborators(activeCollaborators)
        onCollaboratorUpdate?.(activeCollaborators)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await channel.track({
            user_id: currentUserId,
            user_name: currentUserName,
            user_color: COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)],
            cursor_position: null,
            last_active: new Date().toISOString()
          })
        }
      })

    // Cleanup on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [essayId, currentUserId, currentUserName, supabase, onCollaboratorUpdate])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Collaborators avatars */}
      <div className="flex items-center -space-x-2">
        {collaborators.slice(0, 3).map((collab, index) => (
          <div
            key={collab.user_id}
            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-xs font-medium shadow-sm"
            style={{ backgroundColor: collab.user_color, zIndex: 10 - index }}
            title={collab.user_name}
          >
            {collab.user_name.charAt(0).toUpperCase()}
          </div>
        ))}

        {collaborators.length > 3 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-500 flex items-center justify-center text-white text-xs font-medium shadow-sm"
            style={{ zIndex: 7 }}
          >
            +{collaborators.length - 3}
          </div>
        )}
      </div>

      {/* Active indicator */}
      {collaborators.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
          <span>{collaborators.length} online</span>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {/* Share modal */}
      {isShareModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsShareModalOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] w-full max-w-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share Essay
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Anyone with this link can view and edit this essay in real-time.
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {collaborators.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Currently editing ({collaborators.length})
                  </p>
                  <div className="space-y-2">
                    {collaborators.map((collab) => (
                      <div key={collab.user_id} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: collab.user_color }}
                        >
                          {collab.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {collab.user_name}
                        </span>
                        <Circle className="w-2 h-2 fill-green-500 text-green-500 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
