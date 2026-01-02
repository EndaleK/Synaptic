"use client"

import { Check, X, Brain, Sparkles, Target, Zap, BookOpen, Mic, Network, ClipboardCheck, Clock, Bot } from "lucide-react"

interface ComparisonFeature {
  name: string
  synaptic: boolean | string
  quizlet: boolean | string
  notebookLM: boolean | string
  anki: boolean | string
  notesXP: boolean | string
}

const comparisonFeatures: ComparisonFeature[] = [
  { name: "AI-Generated Flashcards", synaptic: true, quizlet: true, notebookLM: false, anki: false, notesXP: true },
  { name: "Spaced Repetition (SM-2)", synaptic: true, quizlet: "Basic", notebookLM: false, anki: true, notesXP: false },
  { name: "Mock Exam Generator", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: true },
  { name: "Adaptive Difficulty Exams", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: false },
  { name: "AI Audio Podcasts", synaptic: true, quizlet: false, notebookLM: true, anki: false, notesXP: false },
  { name: "Interactive Mind Maps", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: false },
  { name: "Document Chat (RAG)", synaptic: true, quizlet: false, notebookLM: true, anki: false, notesXP: true },
  { name: "YouTube Integration", synaptic: true, quizlet: false, notebookLM: true, anki: false, notesXP: false },
  { name: "Writing Assistant", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: false },
  { name: "Study Scheduling", synaptic: true, quizlet: false, notebookLM: false, anki: "Manual", notesXP: false },
  { name: "Exam Readiness Score", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: false },
  { name: "Learning Style Adaptation", synaptic: true, quizlet: false, notebookLM: false, anki: false, notesXP: false },
  { name: "Large Documents (80MB+)", synaptic: "80MB+", quizlet: "N/A", notebookLM: "50MB", anki: "N/A", notesXP: "25MB" },
  { name: "Offline Access (PWA)", synaptic: true, quizlet: true, notebookLM: false, anki: true, notesXP: false },
]

const pricingComparison = [
  { name: "Synaptic", price: "$6.99/mo", yearlyPrice: "$83.88/yr", features: "12 tools, all-in-one", highlight: true },
  { name: "Quizlet Plus", price: "$7.99/mo", yearlyPrice: "$47.88/yr", features: "Flashcards only" },
  { name: "NotebookLM", price: "Free*", yearlyPrice: "Google One $120/yr", features: "Audio + Chat only" },
  { name: "Anki", price: "Free", yearlyPrice: "$25 iOS", features: "Flashcards, complex setup" },
  { name: "NotesXP", price: "$9.99/mo", yearlyPrice: "$119.88/yr", features: "Limited features" },
]

export function CompetitorComparison() {
  return (
    <div className="space-y-12">
      {/* Feature Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
          <thead>
            <tr className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b border-gray-200 dark:border-gray-800">
              <th className="text-left p-4 md:p-6 font-bold text-black dark:text-white">Feature</th>
              <th className="text-center p-4 md:p-6 font-bold">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <Brain className="w-5 h-5" />
                    <span>Synaptic</span>
                  </div>
                  <span className="text-xs font-normal text-purple-500 dark:text-purple-400">$6.99/mo</span>
                </div>
              </th>
              <th className="text-center p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-1">
                  <span>Quizlet</span>
                  <span className="text-xs font-normal">$7.99/mo</span>
                </div>
              </th>
              <th className="text-center p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-1">
                  <span>NotebookLM</span>
                  <span className="text-xs font-normal">Free*</span>
                </div>
              </th>
              <th className="text-center p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-1">
                  <span>Anki</span>
                  <span className="text-xs font-normal">Free/$25</span>
                </div>
              </th>
              <th className="text-center p-4 md:p-6 font-semibold text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-1">
                  <span>NotesXP</span>
                  <span className="text-xs font-normal">$9.99/mo</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {comparisonFeatures.map((feature, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 dark:text-white text-sm md:text-base">
                  {feature.name}
                </td>
                <td className="p-4 text-center bg-purple-50/50 dark:bg-purple-900/10">
                  <FeatureStatus value={feature.synaptic} highlight />
                </td>
                <td className="p-4 text-center">
                  <FeatureStatus value={feature.quizlet} />
                </td>
                <td className="p-4 text-center">
                  <FeatureStatus value={feature.notebookLM} />
                </td>
                <td className="p-4 text-center">
                  <FeatureStatus value={feature.anki} />
                </td>
                <td className="p-4 text-center">
                  <FeatureStatus value={feature.notesXP} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
          *NotebookLM is free but requires Google One ($120/yr) for full features. Prices as of 2025.
        </p>
      </div>

      {/* Savings Calculator */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-6 md:p-10 border-2 border-green-200 dark:border-green-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-full text-green-700 dark:text-green-300 text-sm font-bold mb-4">
            <Sparkles className="w-4 h-4" />
            SAVINGS CALCULATOR
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            How Much Would You Spend?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Compare the cost of using separate apps vs Synaptic's all-in-one platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Separate Apps */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-red-200 dark:border-red-800">
            <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
              <X className="w-5 h-5" />
              Separate Apps (Per Year)
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Quizlet Plus</span>
                <span className="font-semibold text-gray-900 dark:text-white">$47.88</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Google One (for NotebookLM)</span>
                <span className="font-semibold text-gray-900 dark:text-white">$119.88</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Notion AI</span>
                <span className="font-semibold text-gray-900 dark:text-white">$96.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Exam Prep App</span>
                <span className="font-semibold text-gray-900 dark:text-white">$99.00</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">$362.76/yr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Synaptic */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-green-400 dark:border-green-600 shadow-lg">
            <h4 className="text-lg font-bold text-green-600 dark:text-green-400 mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Synaptic All-in-One (Per Year)
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Smart Flashcards + SM-2</span>
                <span className="text-green-600 dark:text-green-400">Included</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">AI Podcasts & Chat</span>
                <span className="text-green-600 dark:text-green-400">Included</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Study Planning & Notes</span>
                <span className="text-green-600 dark:text-green-400">Included</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">Mock Exams + Adaptive</span>
                <span className="text-green-600 dark:text-green-400">Included</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">Student Plan</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">$83.88/yr</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Banner */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-xl">
            <Zap className="w-6 h-6" />
            <span className="text-xl md:text-2xl font-bold">You Save: $278.88/year (77%)</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Exam Readiness Score</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Unique to Synaptic: Know exactly how prepared you are with our AI-powered readiness calculator.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-blue-200 dark:border-blue-800 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Study Buddy AI</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Context-aware AI tutor that knows your documents, schedule, and adapts to your learning style.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-orange-200 dark:border-orange-800 shadow-lg">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Adaptive Mock Exams</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Exams that adjust difficulty in real-time based on your performance. Only on Synaptic.
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureStatus({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <Check className={`w-5 h-5 mx-auto ${highlight ? 'text-green-600 dark:text-green-400' : 'text-green-500 dark:text-green-500'}`} />
    )
  }
  if (value === false) {
    return (
      <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
    )
  }
  // String value (like "Basic" or "80MB+")
  return (
    <span className={`text-sm font-medium ${highlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}`}>
      {value}
    </span>
  )
}

export default CompetitorComparison
