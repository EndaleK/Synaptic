"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Share2, X, Flame, BookOpen, Headphones, ClipboardCheck, Trophy, Sparkles } from "lucide-react"
import { useToast } from "./ToastContainer"
import SocialShareButtons from "./SocialShareButtons"
import QRCode from "qrcode"

interface StudyStats {
  streak: number
  flashcardsReviewed: number
  hoursStudied: number
  examsCompleted: number
  achievementsUnlocked: number
  podcastsListened?: number
  topSubject?: string
  percentile?: number // "You studied more than X% of users"
}

interface StudyWrappedProps {
  stats: StudyStats
  period: 'week' | 'month' | 'semester' | 'year'
  userName: string
  isOpen: boolean
  onClose: () => void
}

const periodLabels = {
  week: 'This Week',
  month: 'This Month',
  semester: 'This Semester',
  year: '2026'
}

const themes = [
  {
    id: 'purple',
    name: 'Purple Dreams',
    bgGradient: 'from-purple-600 via-pink-500 to-orange-400',
    cardBg: 'bg-white/10',
    textColor: 'text-white'
  },
  {
    id: 'dark',
    name: 'Midnight',
    bgGradient: 'from-gray-900 via-purple-900 to-gray-900',
    cardBg: 'bg-white/5',
    textColor: 'text-white'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bgGradient: 'from-cyan-500 via-blue-500 to-purple-600',
    cardBg: 'bg-white/10',
    textColor: 'text-white'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bgGradient: 'from-orange-500 via-pink-500 to-purple-600',
    cardBg: 'bg-white/10',
    textColor: 'text-white'
  }
]

export default function StudyWrapped({ stats, period, userName, isOpen, onClose }: StudyWrappedProps) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=wrapped`
    : 'https://synaptic.study'

  // Generate QR code on mount
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 80,
      margin: 1,
      color: {
        dark: '#FFFFFF',
        light: '#00000000'
      }
    }).then(setQrCodeUrl).catch(console.error)
  }, [shareUrl])

  const handleDownload = async () => {
    if (!cardRef.current) return

    setIsGenerating(true)

    try {
      // Dynamic import html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: null,
        logging: false
      })

      const link = document.createElement('a')
      link.download = `synaptic-wrapped-${period}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast?.success('Image downloaded!')
    } catch (error) {
      console.error('Error generating image:', error)
      toast?.error('Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const shareText = `🔥 ${stats.streak}-day study streak on @SynapticStudy!

📚 ${stats.flashcardsReviewed.toLocaleString()} flashcards mastered
🎧 ${stats.hoursStudied}h of studying
🏆 ${stats.achievementsUnlocked} achievements unlocked

Join me → ${shareUrl}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Share Your Progress</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Download or share to social media</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Theme selector */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Choose theme</p>
          <div className="flex gap-2">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.bgGradient} border-2 transition-all ${
                  selectedTheme.id === theme.id
                    ? 'border-purple-500 scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                title={theme.name}
              />
            ))}
          </div>
        </div>

        {/* Preview Card - Instagram Story Format (9:16 aspect ratio scaled down) */}
        <div className="p-5">
          <div
            ref={cardRef}
            className={`relative w-full aspect-[9/16] max-h-[400px] bg-gradient-to-br ${selectedTheme.bgGradient} rounded-2xl overflow-hidden p-6 flex flex-col`}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

            {/* Header */}
            <div className="relative text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-white/80" />
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Synaptic Wrapped</span>
                <Sparkles className="w-5 h-5 text-white/80" />
              </div>
              <p className="text-white/60 text-xs">{periodLabels[period]}</p>
            </div>

            {/* Main Stat - Streak */}
            <div className={`relative ${selectedTheme.cardBg} backdrop-blur-sm rounded-xl p-4 mb-4`}>
              <div className="flex items-center justify-center gap-3">
                <Flame className="w-8 h-8 text-orange-400" />
                <div className="text-center">
                  <p className="text-3xl font-black text-white">{stats.streak}</p>
                  <p className="text-xs text-white/70 uppercase tracking-wide">Day Streak</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="relative grid grid-cols-2 gap-3 mb-4 flex-1">
              <div className={`${selectedTheme.cardBg} backdrop-blur-sm rounded-xl p-3 flex items-center gap-2`}>
                <BookOpen className="w-5 h-5 text-blue-300" />
                <div>
                  <p className="text-lg font-bold text-white">{stats.flashcardsReviewed.toLocaleString()}</p>
                  <p className="text-[10px] text-white/60">Flashcards</p>
                </div>
              </div>
              <div className={`${selectedTheme.cardBg} backdrop-blur-sm rounded-xl p-3 flex items-center gap-2`}>
                <Headphones className="w-5 h-5 text-green-300" />
                <div>
                  <p className="text-lg font-bold text-white">{stats.hoursStudied}h</p>
                  <p className="text-[10px] text-white/60">Studied</p>
                </div>
              </div>
              <div className={`${selectedTheme.cardBg} backdrop-blur-sm rounded-xl p-3 flex items-center gap-2`}>
                <ClipboardCheck className="w-5 h-5 text-purple-300" />
                <div>
                  <p className="text-lg font-bold text-white">{stats.examsCompleted}</p>
                  <p className="text-[10px] text-white/60">Exams</p>
                </div>
              </div>
              <div className={`${selectedTheme.cardBg} backdrop-blur-sm rounded-xl p-3 flex items-center gap-2`}>
                <Trophy className="w-5 h-5 text-amber-300" />
                <div>
                  <p className="text-lg font-bold text-white">{stats.achievementsUnlocked}</p>
                  <p className="text-[10px] text-white/60">Achievements</p>
                </div>
              </div>
            </div>

            {/* Percentile (if available) */}
            {stats.percentile && (
              <div className="relative text-center mb-3">
                <p className="text-white/80 text-xs">
                  You studied more than <span className="font-bold text-white">{stats.percentile}%</span> of users
                </p>
              </div>
            )}

            {/* Top Subject */}
            {stats.topSubject && (
              <div className="relative text-center mb-3">
                <p className="text-white/60 text-xs">Top Subject</p>
                <p className="text-white font-semibold text-sm">{stats.topSubject}</p>
              </div>
            )}

            {/* Footer with QR */}
            <div className="relative flex items-center justify-between mt-auto pt-3 border-t border-white/20">
              <div>
                <p className="text-white/60 text-[10px]">@{userName}</p>
                <p className="text-white font-bold text-xs">synaptic.study</p>
              </div>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-12 h-12" />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-4">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Image
              </>
            )}
          </button>

          {/* Social Share */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Or share directly</p>
            <SocialShareButtons
              url={shareUrl}
              title={shareText}
              hashtags={['StudyWithSynaptic', 'StudyWrapped', 'StudentLife']}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to fetch user stats
export function useStudyStats() {
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/user/stats', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        } else {
          setError('Failed to fetch stats')
        }
      } catch (err) {
        setError('Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return { stats, loading, error }
}
