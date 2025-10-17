"use client"

import { useState } from "react"
import { Brain, Eye, Ear, Hand, BookOpen, ArrowRight, ArrowLeft } from "lucide-react"

interface QuizQuestion {
  id: string
  question: string
  options: {
    text: string
    style: "visual" | "auditory" | "kinesthetic" | "reading_writing"
  }[]
}

const questions: QuizQuestion[] = [
  {
    id: "q1",
    question: "When learning something new, I prefer to:",
    options: [
      { text: "Watch videos or look at diagrams and charts", style: "visual" },
      { text: "Listen to explanations or discuss with others", style: "auditory" },
      { text: "Try it hands-on and learn by doing", style: "kinesthetic" },
      { text: "Read detailed instructions or articles", style: "reading_writing" },
    ],
  },
  {
    id: "q2",
    question: "When studying, I find it most helpful to:",
    options: [
      { text: "Use color-coded notes and mind maps", style: "visual" },
      { text: "Record myself reading notes and listen back", style: "auditory" },
      { text: "Walk around while studying or use gestures", style: "kinesthetic" },
      { text: "Write and rewrite notes multiple times", style: "reading_writing" },
    ],
  },
  {
    id: "q3",
    question: "I remember information best when:",
    options: [
      { text: "I can see it as images or diagrams", style: "visual" },
      { text: "I hear it explained or discuss it", style: "auditory" },
      { text: "I practice and apply it physically", style: "kinesthetic" },
      { text: "I read and take notes about it", style: "reading_writing" },
    ],
  },
  {
    id: "q4",
    question: "When following directions, I prefer:",
    options: [
      { text: "Maps, diagrams, or visual guides", style: "visual" },
      { text: "Verbal instructions or audio guidance", style: "auditory" },
      { text: "Figuring it out as I go", style: "kinesthetic" },
      { text: "Written step-by-step instructions", style: "reading_writing" },
    ],
  },
  {
    id: "q5",
    question: "In a classroom, I learn best from:",
    options: [
      { text: "Visual presentations and demonstrations", style: "visual" },
      { text: "Lectures and discussions", style: "auditory" },
      { text: "Labs, experiments, and activities", style: "kinesthetic" },
      { text: "Textbooks and handouts", style: "reading_writing" },
    ],
  },
  {
    id: "q6",
    question: "When I'm bored, I tend to:",
    options: [
      { text: "Watch videos or browse images", style: "visual" },
      { text: "Listen to music or podcasts", style: "auditory" },
      { text: "Move around, fidget, or do something active", style: "kinesthetic" },
      { text: "Read books or articles", style: "reading_writing" },
    ],
  },
  {
    id: "q7",
    question: "I communicate best through:",
    options: [
      { text: "Visual aids, sketches, or diagrams", style: "visual" },
      { text: "Speaking and verbal explanations", style: "auditory" },
      { text: "Body language and demonstrations", style: "kinesthetic" },
      { text: "Writing detailed messages or emails", style: "reading_writing" },
    ],
  },
  {
    id: "q8",
    question: "When solving problems, I:",
    options: [
      { text: "Visualize the solution or draw it out", style: "visual" },
      { text: "Talk through it with myself or others", style: "auditory" },
      { text: "Try different approaches hands-on", style: "kinesthetic" },
      { text: "Write down pros and cons or make lists", style: "reading_writing" },
    ],
  },
  {
    id: "q9",
    question: "My ideal study environment includes:",
    options: [
      { text: "Good lighting and organized visual space", style: "visual" },
      { text: "Background music or natural sounds", style: "auditory" },
      { text: "Room to move and change positions", style: "kinesthetic" },
      { text: "Quiet space with plenty of reading material", style: "reading_writing" },
    ],
  },
  {
    id: "q10",
    question: "When learning a new skill, I prefer:",
    options: [
      { text: "Watching tutorial videos", style: "visual" },
      { text: "Having someone explain it to me", style: "auditory" },
      { text: "Jumping in and experimenting", style: "kinesthetic" },
      { text: "Reading documentation or manuals", style: "reading_writing" },
    ],
  },
]

const styleInfo = {
  visual: {
    icon: Eye,
    name: "Visual Learner",
    color: "from-blue-500 to-cyan-500",
    description: "You learn best through seeing and visualizing",
  },
  auditory: {
    icon: Ear,
    name: "Auditory Learner",
    color: "from-purple-500 to-pink-500",
    description: "You learn best through listening and speaking",
  },
  kinesthetic: {
    icon: Hand,
    name: "Kinesthetic Learner",
    color: "from-green-500 to-emerald-500",
    description: "You learn best through doing and moving",
  },
  reading_writing: {
    icon: BookOpen,
    name: "Reading/Writing Learner",
    color: "from-orange-500 to-red-500",
    description: "You learn best through reading and writing",
  },
}

interface Props {
  onComplete: (responses: Record<string, string>) => void
  isLoading?: boolean
}

export default function LearningStyleQuiz({ onComplete, isLoading }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const progress = ((currentQuestion + 1) / questions.length) * 100
  const question = questions[currentQuestion]

  const handleSelect = (style: string) => {
    setSelectedOption(style)
  }

  const handleNext = () => {
    if (!selectedOption) return

    const newResponses = {
      ...responses,
      [question.id]: selectedOption,
    }
    setResponses(newResponses)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedOption(null)
    } else {
      // Quiz complete
      onComplete(newResponses)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setSelectedOption(responses[questions[currentQuestion - 1].id] || null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-white dark:text-black" />
        </div>
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          Discover Your Learning Style
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Answer {questions.length} questions to personalize your learning experience
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-3xl p-8 mb-8 shadow-xl">
        <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
          {question.question}
        </h2>

        <div className="space-y-4">
          {question.options.map((option, index) => {
            const styleData = styleInfo[option.style]
            const isSelected = selectedOption === option.style
            const Icon = styleData.icon

            return (
              <button
                key={index}
                onClick={() => handleSelect(option.style)}
                disabled={isLoading}
                className={`w-full p-6 rounded-2xl border-2 transition-all text-left group ${
                  isSelected
                    ? "border-black dark:border-white bg-black dark:bg-white"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-white dark:bg-black"
                        : `bg-gradient-to-br ${styleData.color}`
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isSelected ? "text-black dark:text-white" : "text-white"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isSelected
                          ? "text-white dark:text-black"
                          : "text-black dark:text-white"
                      }`}
                    >
                      {option.text}
                    </p>
                    <p
                      className={`text-sm ${
                        isSelected
                          ? "text-gray-300 dark:text-gray-700"
                          : "text-gray-500 dark:text-gray-500"
                      }`}
                    >
                      {styleData.name}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        {currentQuestion > 0 && (
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={!selectedOption || isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              Analyzing...
            </>
          ) : currentQuestion === questions.length - 1 ? (
            <>
              Complete Quiz
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              Next Question
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
