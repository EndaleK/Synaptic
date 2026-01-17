"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { SynapticLogo } from "@/components/SynapticLogo"
import dynamic from "next/dynamic"

// Dynamically import UserButton to avoid hydration mismatch
const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false, loading: () => <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /> }
)
import {
  Play, Pause, Square, ChevronDown, RotateCcw, Coffee, Brain, Zap,
  Settings
} from "lucide-react"
import { usePomodoroStore } from "@/lib/store/usePomodoroStore"
import { useUIStore } from "@/lib/store/useStore"
import {
  DocumentIcon,
  PlannerIcon,
  TargetIcon,
  GraduationIcon,
  LibraryIcon,
  StudyGuideIcon,
} from "@/components/illustrations"

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60]

export default function StudyToolsTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { setActiveMode } = useUIStore()
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const {
    status,
    timeRemaining,
    timerType,
    sessionsCompleted,
    focusDuration,
    shortBreakDuration,
    longBreakDuration,
    startTimer,
    pauseTimer,
    stopTimer,
    switchTimerType,
    setFocusDuration,
    setShortBreakDuration,
    setLongBreakDuration,
    resetTimer
  } = usePomodoroStore()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get timer type label and icon
  const getTimerConfig = () => {
    switch (timerType) {
      case 'focus':
        return { label: 'Focus', icon: Brain, color: 'text-green-600 dark:text-green-400' }
      case 'shortBreak':
        return { label: 'Break', icon: Coffee, color: 'text-blue-600 dark:text-blue-400' }
      case 'longBreak':
        return { label: 'Long Break', icon: Zap, color: 'text-purple-600 dark:text-purple-400' }
      default:
        return { label: 'Focus', icon: Brain, color: 'text-neutral-600 dark:text-neutral-400' }
    }
  }

  const timerConfig = getTimerConfig()
  const TimerIcon = timerConfig.icon

  // Handle logo click - go to dashboard home
  const handleLogoClick = () => {
    setActiveMode('home')
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
    }
  }

  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-[56px] items-center px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/30 dark:border-gray-800/30">
      {/* Left: Logo - stays in dashboard */}
      <div className="flex-shrink-0">
        <div onClick={handleLogoClick} className="cursor-pointer">
          <SynapticLogo size="sm" disableLink />
        </div>
      </div>

      {/* Center: Docs and Tools */}
      <nav className="flex-1 flex items-center justify-center gap-2">
        {/* Docs link */}
        <Link
          href="/dashboard/documents"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/documents'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <DocumentIcon size="sm" />
          <span>Documents</span>
        </Link>

        {/* Library link */}
        <Link
          href="/dashboard/library"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/library'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <LibraryIcon size="sm" />
          <span>Library</span>
        </Link>

        {/* Calendar link */}
        <Link
          href="/dashboard/study/calendar"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/study/calendar'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <PlannerIcon size="sm" />
          <span>Calendar</span>
        </Link>

        {/* Statistics link */}
        <Link
          href="/dashboard/study/statistics"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/study/statistics'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <TargetIcon size="sm" />
          <span>Statistics</span>
        </Link>

        {/* Study Planner link */}
        <Link
          href="/dashboard/study-plans"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/study-plans'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <GraduationIcon size="sm" />
          <span>Study Planner</span>
        </Link>

        {/* Study Guide link */}
        <Link
          href="/dashboard/study-guide"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            pathname === '/dashboard/study-guide'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <StudyGuideIcon size="sm" />
          <span>Study Guide</span>
        </Link>
      </nav>

      {/* Right: Settings, Profile, Pomodoro */}
      <div className="flex items-center gap-2">

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className={`p-2 rounded-lg transition-colors ${
            pathname === '/dashboard/settings'
              ? "bg-[#7B3FF2]/10 dark:bg-[#7B3FF2]/20 text-[#7B3FF2] dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Profile */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Pomodoro Timer */}
        <div className="relative" ref={settingsRef}>
          <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
            status === 'running'
              ? "bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500/30"
              : status === 'paused'
              ? "bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500/30"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <TimerIcon className={`w-4 h-4 ${
                status === 'running' ? 'text-green-600 dark:text-green-400' :
                status === 'paused' ? 'text-amber-600 dark:text-amber-400' :
                timerConfig.color
              }`} />
              <span className={`font-mono tabular-nums text-sm font-semibold ${
                status === 'running' ? 'text-green-600 dark:text-green-400' :
                status === 'paused' ? 'text-amber-600 dark:text-amber-400' :
                'text-gray-700 dark:text-gray-300'
              }`}>
                {formatTime(timeRemaining)}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {/* Control buttons */}
            <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-gray-700 pl-2 ml-1">
              {status === 'idle' && (
                <button
                  onClick={startTimer}
                  className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                  title="Start"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              {status === 'running' && (
                <>
                  <button
                    onClick={pauseTimer}
                    className="p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={stopTimer}
                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                    title="Stop"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <button
                    onClick={startTimer}
                    className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
                    title="Resume"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={stopTimer}
                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                    title="Stop"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pomodoro Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl p-4 z-50">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sessions completed</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{sessionsCompleted}</span>
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Timer Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { switchTimerType('focus'); setShowSettings(false) }}
                    disabled={status !== 'idle'}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      timerType === 'focus'
                        ? 'bg-green-100 dark:bg-green-900/30 ring-1 ring-green-500/30 text-green-600 dark:text-green-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Brain className="w-5 h-5" />
                    <span className="text-xs font-medium">Focus</span>
                  </button>
                  <button
                    onClick={() => { switchTimerType('shortBreak'); setShowSettings(false) }}
                    disabled={status !== 'idle'}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      timerType === 'shortBreak'
                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Coffee className="w-5 h-5" />
                    <span className="text-xs font-medium">Break</span>
                  </button>
                  <button
                    onClick={() => { switchTimerType('longBreak'); setShowSettings(false) }}
                    disabled={status !== 'idle'}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      timerType === 'longBreak'
                        ? 'bg-purple-100 dark:bg-purple-900/30 ring-1 ring-purple-500/30 text-purple-600 dark:text-purple-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    } ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Zap className="w-5 h-5" />
                    <span className="text-xs font-medium">Long</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Duration (minutes)
                </label>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Focus</span>
                  </div>
                  <select
                    value={focusDuration}
                    onChange={(e) => setFocusDuration(Number(e.target.value))}
                    disabled={status !== 'idle' && timerType === 'focus'}
                    className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/50 disabled:opacity-50"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Short Break</span>
                  </div>
                  <select
                    value={shortBreakDuration}
                    onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                    disabled={status !== 'idle' && timerType === 'shortBreak'}
                    className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Long Break</span>
                  </div>
                  <select
                    value={longBreakDuration}
                    onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                    disabled={status !== 'idle' && timerType === 'longBreak'}
                    className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => { resetTimer(); setShowSettings(false) }}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Timer
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
