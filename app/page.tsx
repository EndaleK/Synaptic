"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { BookOpen, Brain, MessageSquare, Mic, Network, Sparkles, ArrowRight, Check } from "lucide-react"
import Logo from "@/components/Logo"

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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-5xl mx-auto">
            {/* Brand Logo */}
            <div className="mb-10 flex justify-center">
              <img
                src="/logo-full.png"
                alt="Synaptic - Study Smarter"
                width={220}
                height={220}
                className="object-contain w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[220px] md:h-[220px]"
              />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white mb-6 leading-tight tracking-tight">
              Transform Documents Into
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35]">
                Knowledge
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              AI-powered flashcards, podcasts, and mind maps tailored to your learning style.
              Study smarter with intelligent, personalized content.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                className="group px-8 py-4 bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35] text-white rounded-xl font-semibold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center gap-2 min-w-[220px] justify-center"
              >
                {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-[#7B3FF2] dark:text-white border-2 border-[#E91E8C]/30 dark:border-gray-700 rounded-xl font-semibold text-lg hover:bg-purple-50 dark:hover:bg-gray-700 hover:border-[#E91E8C]/50 transition-all min-w-[220px] justify-center"
              >
                Explore Features
              </Link>
            </div>

            {/* Social Proof */}
            <p className="text-sm text-gray-500 dark:text-gray-500">
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#7B3FF2] to-[#E91E8C] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-white" />
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#2D3E9F] to-[#7B3FF2] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white" />
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#E91E8C] to-[#FF6B35] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="w-7 h-7 text-white" />
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B35] to-[#E91E8C] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-7 h-7 text-white" />
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#7B3FF2] to-[#FF6B35] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-white" />
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
              <div className="w-14 h-14 bg-gradient-to-br from-[#2D3E9F] to-[#E91E8C] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-white" />
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
      <section className="relative py-24 overflow-hidden bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-black dark:via-purple-950/20 dark:to-black">
        {/* Animated background mesh */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-300/20 via-pink-300/20 to-purple-300/20 dark:from-purple-600/10 dark:via-pink-600/10 dark:to-purple-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                Simple & Powerful
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Get started in three simple steps and transform how you learn
            </p>
          </div>

          {/* Steps Container with Progress Line */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Animated Progress Line (desktop only) */}
            <div className="hidden md:block absolute top-20 left-0 right-0 h-1 -z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 dark:from-purple-800 dark:via-pink-800 dark:to-purple-800 rounded-full" />
              <div className="absolute left-0 top-1/2 w-3 h-3 -mt-1.5 bg-purple-500 rounded-full animate-pulse" />
              <div className="absolute left-1/2 top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="absolute right-0 top-1/2 w-3 h-3 -mt-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>

            {/* Step 1 */}
            <div className="group relative">
              <div className="relative p-8 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                    1
                  </div>
                </div>

                <div className="relative text-center">
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                    Discover Your Style
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Take our quick learning style assessment to personalize your experience
                  </p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    ⚡ Takes just 2 minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="relative p-8 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-pink-200/50 dark:border-pink-800/50 hover:border-pink-400 dark:hover:border-pink-600 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-2">
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 rounded-3xl" />

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/30 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-10 h-10 text-white" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                    2
                  </div>
                </div>

                <div className="relative text-center">
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                    Upload Documents
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Drop in your study materials, textbooks, or notes in any format
                  </p>
                  <p className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                    📄 PDF, DOCX, TXT supported
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="relative p-8 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
                {/* Glass overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />

                {/* Icon Badge */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                    3
                  </div>
                </div>

                <div className="relative text-center">
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                    Learn Your Way
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    Choose your preferred mode and let AI guide you to mastery
                  </p>
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    🎯 Personalized to you
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-grid-white/[0.05]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Floating particles effect */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
        <div className="absolute top-20 right-20 w-3 h-3 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 right-1/3 w-3 h-3 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Elevated Card Container */}
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
            {/* Gradient border glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-3xl blur-xl -z-10" />

            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Join Our Learning Community
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-6 leading-tight">
                Ready to Transform
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                  Your Learning?
                </span>
              </h2>

              {/* Subheadline with social proof */}
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                Join <span className="font-bold text-purple-600 dark:text-purple-400">10,000+</span> learners who study smarter with AI
              </p>

              {/* Primary CTA Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
                <Link
                  href={isSignedIn ? "/dashboard" : "/sign-in"}
                  className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 overflow-hidden"
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <span>{isSignedIn ? "Go to Dashboard" : "Get Started Free"}</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 px-8 py-5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-2 border-gray-200 dark:border-gray-700"
                >
                  <BookOpen className="w-5 h-5" />
                  Learn More
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium">Free tier available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium">Cancel anytime</span>
                </div>
              </div>

              {/* Stats/Social Proof Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-1">
                    10,000+
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Active Learners
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-1">
                    4.9★
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Average Rating
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-1">
                    100%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Free Forever Plan
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Copyright Footer */}
      <footer className="py-6 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2025 Synaptic. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
