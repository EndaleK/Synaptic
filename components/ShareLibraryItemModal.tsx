"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check, Globe, Lock, Link2, QrCode } from "lucide-react"
import { useToast } from "./ToastContainer"
import SocialShareButtons from "./SocialShareButtons"
import QRCode from "qrcode"

type ContentType = 'document' | 'flashcards' | 'podcast' | 'mindmap'

interface ShareItem {
  id: string
  type: ContentType
  name: string
  shareToken?: string
  isPublic?: boolean
}

interface ShareLibraryItemModalProps {
  item: ShareItem
  isOpen: boolean
  onClose: () => void
  onVisibilityChange?: (isPublic: boolean) => void
}

const contentTypeLabels: Record<ContentType, string> = {
  document: 'Document',
  flashcards: 'Flashcards',
  podcast: 'Podcast',
  mindmap: 'Mind Map'
}

const contentTypeIcons: Record<ContentType, string> = {
  document: '📄',
  flashcards: '🗂️',
  podcast: '🎧',
  mindmap: '🗺️'
}

export default function ShareLibraryItemModal({
  item,
  isOpen,
  onClose,
  onVisibilityChange
}: ShareLibraryItemModalProps) {
  const [isPublic, setIsPublic] = useState(item.isPublic || false)
  const [copied, setCopied] = useState(false)
  const [shareToken, setShareToken] = useState(item.shareToken || '')
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [showQR, setShowQR] = useState(false)
  const toast = useToast()

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://synaptic.study'}/shared/${item.type}/${shareToken}`
    : ''

  // Generate QR code when URL is available
  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl).catch(console.error)
    }
  }, [shareUrl])

  // Generate share token if not exists
  const generateShareToken = async () => {
    if (shareToken) return

    setIsGeneratingToken(true)
    try {
      const response = await fetch(`/api/documents/${item.id}/share`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setShareToken(data.shareToken)
        toast?.success('Share link created!')
      } else {
        toast?.error('Failed to create share link')
      }
    } catch (error) {
      console.error('Error generating share token:', error)
      toast?.error('Failed to create share link')
    } finally {
      setIsGeneratingToken(false)
    }
  }

  // Auto-generate token when modal opens
  useEffect(() => {
    if (isOpen && !shareToken) {
      generateShareToken()
    }
  }, [isOpen])

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast?.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast?.error('Failed to copy link')
    }
  }

  const handleVisibilityToggle = async () => {
    const newValue = !isPublic
    setIsPublic(newValue)

    try {
      await fetch(`/api/documents/${item.id}/share`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: newValue })
      })

      onVisibilityChange?.(newValue)
      toast?.success(newValue ? 'Made public' : 'Made private')
    } catch (error) {
      setIsPublic(!newValue) // Revert on error
      toast?.error('Failed to update visibility')
    }
  }

  const shareText = `Check out my ${contentTypeLabels[item.type].toLowerCase()} on Synaptic: "${item.name}"`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{contentTypeIcons[item.type]}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Share {contentTypeLabels[item.type]}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isPublic ? 'Anyone with the link can view' : 'Only you can access'}
                </p>
              </div>
            </div>
            <button
              onClick={handleVisibilityToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {isGeneratingToken ? (
                  <span className="text-sm text-gray-500">Generating link...</span>
                ) : shareUrl ? (
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{shareUrl}</span>
                ) : (
                  <span className="text-sm text-gray-500">No link available</span>
                )}
              </div>
              <button
                onClick={handleCopyLink}
                disabled={!shareUrl || isGeneratingToken}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* QR Code Toggle */}
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <QrCode className="w-4 h-4" />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>

          {/* QR Code */}
          {showQR && qrCodeUrl && (
            <div className="flex justify-center p-4 bg-white rounded-xl border border-gray-200 dark:border-gray-700">
              <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
            </div>
          )}

          {/* Social Share Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share via
            </label>
            <SocialShareButtons
              url={shareUrl || 'https://synaptic.study'}
              title={shareText}
              hashtags={['StudyWithSynaptic', 'Flashcards']}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}
