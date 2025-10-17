"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, Ear, Hand, BookOpen, Sparkles, ArrowRight, Check } from "lucide-react"

const styleInfo = {
  visual: {
    icon: Eye,
    name: "Visual Learner",
    color: "from-blue-500 to-cyan-500",
    description: "You learn best through seeing and visualizing concepts",
    strengths: [
      "Strong spatial awareness",
      "Good at recognizing patterns",
      "Remembers faces and places well",
      "Thinks in pictures",
    ],
  },
  auditory: {
    icon: Ear,
    name: "Auditory Learner",
    color: "from-purple-500 to-pink-500",
    description: "You learn best through listening and speaking",
    strengths: [
      "Strong listening skills",
      "Good at verbal communication",
      "Remembers conversations well",
      "Enjoys discussions and lectures",
    ],
  },
  kinesthetic: {
    icon: Hand,
    name: "Kinesthetic Learner",
    color: "from-green-500 to-emerald-500",
    description: "You learn best through doing and physical activity",
    strengths: [
      "Hands-on learning",
      "Good coordination",
      "Remembers through practice",
      "Learns by experimenting",
    ],
  },
  reading_writing: {
    icon: BookOpen,
    name: "Reading/Writing Learner",
    color: "from-orange-500 to-red-500",
    description: "You learn best through reading and writing",
    strengths: [
      "Strong written communication",
      "Good at research",
      "Remembers through note-taking",
      "Loves reading and writing",
    ],
  },
}

export default function QuizResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<string | null>(null)

  const style = (searchParams.get("style") || "visual") as keyof typeof styleInfo
  const scoresParam = searchParams.get("scores")
  const scores = scoresParam ? JSON.parse(scoresParam) : {}

  const styleData = styleInfo[style]
  const Icon = styleData.icon

  useEffect(() => {
    // Simulate loading AI analysis
    const timer = setTimeout(() => {
      setLoading(false)
      setAnalysis(
        "Based on your responses, you have a strong preference for " +
          styleData.name.toLowerCase() +
          " learning. This means you'll excel when using our platform's features that align with your natural learning tendencies."
      )
    }, 1500)

    return () => clearTimeout(timer)
  }, [style, styleData.name])

  return (
    <div className="min-h-screen bg-white dark:bg-black py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div
              className={`w-24 h-24 bg-gradient-to-br ${styleData.color} rounded-3xl flex items-center justify-center mb-6 animate-bounce`}
            >
              <Icon className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-black dark:text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
            You're a {styleData.name}!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {styleData.description}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 mb-8 border-2 border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
            Your Learning Style Breakdown
          </h2>

          <div className="space-y-4">
            {Object.entries(scores).map(([key, value]) => {
              const percent = (Number(value) / 10) * 100
              const info = styleInfo[key as keyof typeof styleInfo]
              const InfoIcon = info.icon

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center`}
                      >
                        <InfoIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-black dark:text-white">
                        {info.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {value}/10
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${info.color} transition-all duration-1000`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Analysis */}
        {loading ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-8 mb-8 border-2 border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin" />
              <h2 className="text-xl font-bold text-black dark:text-white">
                AI is analyzing your results...
              </h2>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6" />
            </div>
          </div>
        ) : (
          analysis && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-8 mb-8 border-2 border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white dark:text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white mb-2">
                    Personalized Analysis
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysis}
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Your Strengths */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 mb-8 border-2 border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
            Your Learning Strengths
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {styleData.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-black dark:text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-300">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-3xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white dark:text-black mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-gray-300 dark:text-gray-700 mb-6 max-w-2xl mx-auto">
            Your dashboard is now personalized to match your learning style.
            Let's begin your journey!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-black text-black dark:text-white rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
