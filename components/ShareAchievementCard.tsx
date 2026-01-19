"use client"

import { useState, useRef, useEffect } from "react"
import { Download, X, Award, Star, Sparkles } from "lucide-react"
import { useToast } from "./ToastContainer"
import SocialShareButtons from "./SocialShareButtons"
import QRCode from "qrcode"
import { SHARE_CARD_COLORS, TIER_LABELS } from "@/lib/design/community-colors"

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  tier: AchievementTier
  unlockedAt: Date
  category?: string
}

interface ShareAchievementCardProps {
  achievement: Achievement
  userName: string
  isOpen: boolean
  onClose: () => void
}

// Using shared colors from community-colors.ts for consistency

export default function ShareAchievementCard({ achievement, userName, isOpen, onClose }: ShareAchievementCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const cardRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=achievement`
    : 'https://synaptic.study'

  const tierStyle = SHARE_CARD_COLORS[achievement.tier]

  // Generate QR code
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 60,
      margin: 1,
      color: {
        dark: '#1F2937',
        light: '#00000000'
      }
    }).then(setQrCodeUrl).catch(console.error)
  }, [shareUrl])

  const handleDownload = async () => {
    if (!cardRef.current) return

    setIsGenerating(true)

    try {
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false
      })

      const link = document.createElement('a')
      link.download = `synaptic-achievement-${achievement.name.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast?.success('Achievement card downloaded!')
    } catch (error) {
      console.error('Error generating image:', error)
      toast?.error('Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const shareText = `🏆 Achievement Unlocked on @SynapticStudy!

${TIER_LABELS[achievement.tier]} - ${achievement.name}
${achievement.description}

Join me and start earning achievements → ${shareUrl}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Share Achievement</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Flex your accomplishment!</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview Card - Square format for Instagram feed */}
        <div className="p-5">
          <div
            ref={cardRef}
            className={`relative w-full aspect-square bg-gradient-to-br ${tierStyle.bg} rounded-2xl overflow-hidden p-6 flex flex-col items-center justify-center shadow-2xl ${tierStyle.glow}`}
          >
            {/* Decorative sparkles */}
            <div className="absolute inset-0 overflow-hidden">
              <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/30 animate-pulse" />
              <Sparkles className="absolute top-8 right-8 w-4 h-4 text-white/20 animate-pulse delay-300" />
              <Sparkles className="absolute bottom-12 left-8 w-5 h-5 text-white/25 animate-pulse delay-500" />
              <Star className="absolute top-1/4 right-4 w-4 h-4 text-white/20 animate-pulse delay-700" />
            </div>

            {/* Header */}
            <div className="relative text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className={`w-5 h-5 ${tierStyle.text}`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${tierStyle.text}`}>
                  Achievement Unlocked!
                </span>
                <Award className={`w-5 h-5 ${tierStyle.text}`} />
              </div>
            </div>

            {/* Tier Badge */}
            <div className={`relative px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border ${tierStyle.border} mb-4`}>
              <span className={`text-sm font-bold ${tierStyle.text}`}>
                {TIER_LABELS[achievement.tier]}
              </span>
            </div>

            {/* Achievement Icon */}
            <div className="relative w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 border-2 border-white/30 shadow-lg">
              <span className="text-4xl">{achievement.icon}</span>
            </div>

            {/* Achievement Name & Description */}
            <div className="relative text-center mb-4">
              <h3 className={`text-xl font-black ${tierStyle.text} mb-1`}>
                {achievement.name}
              </h3>
              <p className={`text-sm ${tierStyle.text} opacity-80 max-w-[200px]`}>
                {achievement.description}
              </p>
            </div>

            {/* User & Branding */}
            <div className="relative flex items-center justify-between w-full mt-auto pt-4 border-t border-white/20">
              <div>
                <p className={`${tierStyle.text} opacity-60 text-xs`}>Unlocked by</p>
                <p className={`${tierStyle.text} font-semibold text-sm`}>@{userName}</p>
              </div>
              <div className="flex items-center gap-2">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-10 h-10 rounded" />
                )}
                <div className="text-right">
                  <p className={`${tierStyle.text} font-bold text-xs`}>synaptic.study</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-4">
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
                Download Card
              </>
            )}
          </button>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Share directly</p>
            <SocialShareButtons
              url={shareUrl}
              title={shareText}
              hashtags={['AchievementUnlocked', 'StudyWithSynaptic', 'StudentLife']}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}
