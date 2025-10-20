"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import LearningStyleQuiz from "@/components/LearningStyleQuiz"
import { useUserStore } from "@/lib/store/useStore"

export default function QuizPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { setLearningStyle, setHasCompletedAssessment, setAssessmentScores } = useUserStore()

  const handleQuizComplete = async (responses: Record<string, string>) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/assess-learning-style", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ responses }),
      })

      if (!response.ok) {
        throw new Error("Failed to assess learning style")
      }

      const result = await response.json()

      // Store learning style and assessment results in global state
      setLearningStyle(result.dominantStyle)
      setHasCompletedAssessment(true)
      setAssessmentScores(result.scores)

      // Navigate to results page with data
      router.push(
        `/dashboard/quiz/results?style=${result.dominantStyle}&scores=${JSON.stringify(result.scores)}`
      )
    } catch (error) {
      console.error("Error assessing learning style:", error)
      alert("Failed to assess learning style. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-8">
      <LearningStyleQuiz onComplete={handleQuizComplete} isLoading={isLoading} />
    </div>
  )
}
