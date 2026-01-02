'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  Star,
  Zap,
  Flame,
  BookOpen,
  Target,
  Clock,
  Award,
  Crown,
  Medal,
  ArrowLeft,
  Loader2,
  Lock,
  Sparkles,
  GraduationCap,
  Brain,
  Headphones,
  Map
} from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'study' | 'streak' | 'mastery' | 'social' | 'special'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  requirement: number
  currentProgress: number
  unlockedAt?: string
  xpReward: number
}

export default function AchievementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stats, setStats] = useState({
    totalUnlocked: 0,
    totalAchievements: 0,
    totalXP: 0,
    level: 1
  })

  useEffect(() => {
    fetchAchievements()
  }, [])

  const fetchAchievements = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/achievements')
      if (response.ok) {
        const data = await response.json()
        setAchievements(data.achievements || [])
        setStats({
          totalUnlocked: data.unlockedCount || 0,
          totalAchievements: data.totalCount || 0,
          totalXP: data.totalXP || 0,
          level: data.level || 1
        })
      }
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'trophy': <Trophy className="w-6 h-6" />,
      'star': <Star className="w-6 h-6" />,
      'zap': <Zap className="w-6 h-6" />,
      'flame': <Flame className="w-6 h-6" />,
      'book': <BookOpen className="w-6 h-6" />,
      'target': <Target className="w-6 h-6" />,
      'clock': <Clock className="w-6 h-6" />,
      'award': <Award className="w-6 h-6" />,
      'crown': <Crown className="w-6 h-6" />,
      'medal': <Medal className="w-6 h-6" />,
      'sparkles': <Sparkles className="w-6 h-6" />,
      'graduation': <GraduationCap className="w-6 h-6" />,
      'brain': <Brain className="w-6 h-6" />,
      'headphones': <Headphones className="w-6 h-6" />,
      'map': <Map className="w-6 h-6" />
    }
    return icons[iconName] || <Trophy className="w-6 h-6" />
  }

  const getTierColor = (tier: Achievement['tier']) => {
    switch (tier) {
      case 'bronze':
        return 'from-amber-600 to-amber-800'
      case 'silver':
        return 'from-gray-300 to-gray-500'
      case 'gold':
        return 'from-yellow-400 to-yellow-600'
      case 'platinum':
        return 'from-cyan-300 to-blue-500'
      default:
        return 'from-gray-400 to-gray-600'
    }
  }

  const getTierBorder = (tier: Achievement['tier']) => {
    switch (tier) {
      case 'bronze':
        return 'border-amber-500/50'
      case 'silver':
        return 'border-gray-400/50'
      case 'gold':
        return 'border-yellow-500/50'
      case 'platinum':
        return 'border-cyan-400/50'
      default:
        return 'border-gray-300/50'
    }
  }

  const categories = [
    { value: 'all', label: 'All', icon: Trophy },
    { value: 'study', label: 'Study', icon: BookOpen },
    { value: 'streak', label: 'Streaks', icon: Flame },
    { value: 'mastery', label: 'Mastery', icon: Target },
    { value: 'social', label: 'Social', icon: Award },
    { value: 'special', label: 'Special', icon: Sparkles }
  ]

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  const unlockedAchievements = filteredAchievements.filter(a => a.unlockedAt)
  const lockedAchievements = filteredAchievements.filter(a => !a.unlockedAt)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Achievements</h1>
              <p className="text-white/80 mt-1">Track your learning milestones</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-3xl font-bold">{stats.totalUnlocked}</p>
              <p className="text-sm text-white/80">Unlocked</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-3xl font-bold">{stats.totalAchievements}</p>
              <p className="text-sm text-white/80">Total</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-3xl font-bold">{stats.totalXP.toLocaleString()}</p>
              <p className="text-sm text-white/80">XP Earned</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-3xl font-bold">Lv.{stats.level}</p>
              <p className="text-sm text-white/80">Current Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Unlocked ({unlockedAchievements.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`relative bg-white dark:bg-gray-900 rounded-2xl border-2 ${getTierBorder(achievement.tier)} overflow-hidden`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getTierColor(achievement.tier)} opacity-5`} />
                      <div className="relative p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTierColor(achievement.tier)} flex items-center justify-center text-white shadow-lg`}>
                            {getIcon(achievement.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {achievement.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize bg-gradient-to-r ${getTierColor(achievement.tier)} text-white`}>
                            {achievement.tier}
                          </span>
                          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                            +{achievement.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-400" />
                  Locked ({lockedAchievements.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lockedAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden opacity-75"
                    >
                      <div className="relative p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            {getIcon(achievement.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {achievement.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {achievement.description}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Progress</span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {achievement.currentProgress} / {achievement.requirement}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (achievement.currentProgress / achievement.requirement) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {achievement.tier}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            +{achievement.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAchievements.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
                <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No achievements yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Start studying to unlock achievements!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
