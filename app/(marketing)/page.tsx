"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { BookOpen, Brain, MessageSquare, Mic, Network, Sparkles, ArrowRight, Check } from "lucide-react"

export default function LandingPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-gray-200 to-gray-400 dark:from-gray-800 dark:to-gray-600 opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-black dark:text-white" />
              <span className="text-sm font-medium text-black dark:text-white">
                AI-Powered Personalized Learning
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-black dark:text-white mb-6 leading-tight">
              Learn Smarter,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-black dark:from-gray-400 dark:to-white">
                Not Harder
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Transform your documents into flashcards, podcasts, and mind maps.
              AI adapts to your unique learning style for maximum retention.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                className="group px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:scale-105 transition-all shadow-xl flex items-center gap-2"
              >
                {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Explore Features
              </Link>
            </div>

            {/* Social Proof */}
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
              Trusted by students and professionals worldwide
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              Everything You Need to Learn
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Multiple learning modes powered by AI, all tailored to your learning style
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Flashcards */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Smart Flashcards
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                AI automatically extracts key concepts from your documents and generates
                interactive flashcards with spaced repetition.
              </p>
            </div>

            {/* Feature 2: Chat */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Socratic Teaching
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Chat with your documents through guided dialogue. AI asks questions
                to deepen understanding instead of giving direct answers.
              </p>
            </div>

            {/* Feature 3: Podcasts */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Audio Learning
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Convert documents into AI-narrated podcasts. Learn while commuting,
                exercising, or doing chores. <span className="text-sm bg-black/10 dark:bg-white/10 px-2 py-1 rounded">Coming Soon</span>
              </p>
            </div>

            {/* Feature 4: Mind Maps */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Mind Mapping
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Visualize concepts and their relationships as interactive mind maps.
                See the big picture at a glance. <span className="text-sm bg-black/10 dark:bg-white/10 px-2 py-1 rounded">Coming Soon</span>
              </p>
            </div>

            {/* Feature 5: Learning Style */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Adaptive AI
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Take a quick quiz to discover your learning style. The platform
                adapts to emphasize your preferred learning mode.
              </p>
            </div>

            {/* Feature 6: Multi-format */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-white dark:text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Any Document
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Upload PDFs, DOCX, TXT, or paste text directly. AI handles the rest,
                extracting knowledge from any format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center text-2xl font-bold text-white dark:text-black mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Discover Your Style
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Take our quick learning style assessment to personalize your experience
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center text-2xl font-bold text-white dark:text-black mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Upload Documents
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Drop in your study materials, textbooks, or notes in any format
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center text-2xl font-bold text-white dark:text-black mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Learn Your Way
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your preferred mode and let AI guide you to mastery
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white dark:text-black mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-gray-300 dark:text-gray-700 mb-8">
            Join thousands of learners who study smarter with AI
          </p>
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-in"}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-black text-black dark:text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-xl"
          >
            {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-600">
            No credit card required • Free tier available
          </p>
        </div>
      </section>
    </div>
  )
}
