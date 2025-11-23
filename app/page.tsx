"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { BookOpen, Brain, MessageSquare, Mic, Network, Sparkles, ArrowRight, Check, ClipboardCheck, Youtube, Database, TrendingDown, Users, Award, GraduationCap, Briefcase, Star, FileText, Zap, Bot, Clock, PenTool, BookOpenCheck, ChevronLeft, ChevronRight, Mail, Phone } from "lucide-react"
import Logo from "@/components/Logo"
import { QRCodeGenerator } from "@/components/QRCodeGenerator"
import { SectionsCarousel } from "@/components/SectionsCarousel"
import { PricingCarousel } from "@/components/PricingCarousel"
import { useState } from "react"

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const [currentFeatureSlide, setCurrentFeatureSlide] = useState(0)

  // Features data - all 12 tools
  const features = [
    {
      icon: BookOpen,
      title: "Smart Flashcards",
      subtitle: "SM-2 Spaced Repetition Algorithm",
      description: "Auto-extract key concepts and study with scientifically-proven spaced repetition that knows exactly when to quiz you.",
      gradient: "from-accent-primary to-accent-secondary"
    },
    {
      icon: MessageSquare,
      title: "Socratic Teaching",
      description: "Chat with your documents through guided dialogue. Synaptic's adaptive engine asks questions to deepen understanding instead of giving direct answers.",
      gradient: "from-accent-blue to-accent-primary"
    },
    {
      icon: Mic,
      title: "Audio Learning",
      subtitle: "83% Cheaper Than Competitors",
      description: "Convert documents into natural-sounding podcasts. Perfect for learning while commuting, exercising, or multitasking.",
      gradient: "from-accent-secondary to-accent-orange"
    },
    {
      icon: Network,
      title: "Mind Mapping",
      description: "Visualize concepts with interactive maps featuring relationship types, cross-links, and knowledge integration indicators.",
      gradient: "from-accent-orange to-accent-secondary"
    },
    {
      icon: Brain,
      title: "Adaptive Intelligence",
      description: "Take a quick quiz to discover your learning style. The platform adapts to emphasize your preferred learning mode.",
      gradient: "from-accent-primary to-accent-orange"
    },
    {
      icon: Database,
      title: "80MB+ Documents",
      subtitle: "vs Competitors' 20MB Limits",
      description: "Process massive textbooks, research papers, and training manuals. Chunked processing handles documents others can't.",
      gradient: "from-accent-blue to-accent-secondary"
    },
    {
      icon: ClipboardCheck,
      title: "Mock Exam Simulator",
      badge: "NEW",
      description: "Automatically generated practice tests with performance analytics. Perfect for SAT, AP exams, certifications, and finals.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Youtube,
      title: "Video Learning",
      description: "Extract study materials from YouTube lectures. Generate flashcards, notes, and quizzes from any educational video.",
      gradient: "from-red-500 to-pink-500"
    },
    {
      icon: Bot,
      title: "Study Buddy",
      badge: "NEW",
      description: "Your AI study companion. Ask anything from science to philosophy with tutor, buddy, or comedy modes for personalized learning.",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      icon: Clock,
      title: "Quick Summary",
      subtitle: '"Teach Me in 5 Minutes"',
      badge: "NEW",
      description: "Fast, energetic audio summaries from documents, URLs, or YouTube videos. Perfect for last-minute review or quick overviews.",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: PenTool,
      title: "Writing Assistant",
      badge: "NEW",
      description: "Essay editor with AI-powered suggestions, smart citations (APA/MLA/Chicago), voice dictation, and grammar checking. Transform your writing.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: BookOpenCheck,
      title: "Study Guide",
      badge: "NEW",
      description: "Interactive study guides with comprehensive summaries, key concepts, and practice questions generated from your documents.",
      gradient: "from-teal-500 to-green-500"
    }
  ]

  const featuresPerSlide = 6
  const totalSlides = Math.ceil(features.length / featuresPerSlide)

  const nextSlide = () => {
    setCurrentFeatureSlide((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setCurrentFeatureSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  const currentFeatures = features.slice(
    currentFeatureSlide * featuresPerSlide,
    (currentFeatureSlide + 1) * featuresPerSlide
  )

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative aspect-[1155/678] w-[36.125rem] bg-gradient-to-tr from-gray-200 to-gray-400 dark:from-gray-800 dark:to-gray-600 opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Brand Logo */}
            <div className="mb-0 flex justify-center">
              <img
                src="/logo-full-transparent.png"
                alt="Synaptic™ - Study Smarter"
                width={486}
                height={486}
                className="object-contain w-[354px] h-[354px] sm:w-[443px] sm:h-[443px] md:w-[486px] md:h-[486px]"
              />
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4 leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-orange">Learning That Adapts To Your Needs</span>
              <br />
              <span className="text-black dark:text-white">Everything You Need to Master Any Subject</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto leading-relaxed">
              AI-powered flashcards, mock exams, podcasts, and mind maps—personalized to how you learn best. Master any subject faster.
            </p>

            {/* Stats Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                <Sparkles className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">1M+ Flashcards Generated</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">83% Cost Savings</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                <Award className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Research-Backed</span>
              </div>
            </div>

            {/* CTA Buttons - Enhanced visibility per beta feedback */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-up"}
                className="group relative px-10 py-5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-xl hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center gap-3 min-w-[260px] justify-center ring-4 ring-green-500/20 hover:ring-green-500/40"
              >
                <span className="relative z-10">{isSignedIn ? "Go to Dashboard" : "Get Started Free →"}</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all min-w-[220px] justify-center"
              >
                See All Features
              </Link>
            </div>

            {/* Social Proof */}
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Trusted by high school students, college students, and professionals worldwide
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Twelve Intelligent Tools, One Platform
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From exam prep to content creation—everything you need to excel in high school, college, and beyond
            </p>
          </div>

          {/* Features Carousel */}
          <div className="relative">
            {/* Navigation Arrows - Desktop only */}
            {totalSlides > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 z-10 w-12 h-12 items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-xl border-2 border-gray-200 dark:border-gray-700 hover:scale-110 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
                  aria-label="Previous features"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={nextSlide}
                  className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 z-10 w-12 h-12 items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-xl border-2 border-gray-200 dark:border-gray-700 hover:scale-110 hover:border-purple-500 dark:hover:border-purple-500 transition-all"
                  aria-label="Next features"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentFeatures.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    className="group relative p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800"
                  >
                    {/* NEW badge */}
                    {feature.badge && (
                      <div className="absolute top-4 right-4 px-2 py-1 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-xs font-bold rounded-full">
                        {feature.badge}
                      </div>
                    )}
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    {feature.subtitle && (
                      <p className="text-xs font-semibold text-accent-primary mb-3">{feature.subtitle}</p>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Pagination Dots */}
            {totalSlides > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeatureSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      currentFeatureSlide === index
                        ? 'w-8 bg-gradient-to-r from-purple-600 to-pink-600'
                        : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-purple-400 dark:hover:bg-purple-500'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Mobile Navigation Buttons */}
            {totalSlides > 1 && (
              <div className="flex lg:hidden justify-center gap-4 mt-8">
                <button
                  onClick={prevSlide}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Previous</span>
                </button>
                <button
                  onClick={nextSlide}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-lg"
                >
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Next</span>
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Audience-Specific Smart Sections */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Designed for Every Learner
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Whether you're in high school, college, or advancing your career—Synaptic adapts to your goals
            </p>
          </div>

          {/* Audience Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* High School Students */}
            <div className="group p-10 bg-white dark:bg-gray-900 rounded-3xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white">High School Students</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-center">
                Excel in high school and ace college prep exams
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Mock exams for SAT, AP, and finals</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Flashcards with spaced repetition</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>YouTube lecture → Study materials</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>Socratic tutoring (no direct answers)</span>
                </li>
              </ul>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  "Turn Khan Academy videos into practice tests"
                </p>
              </div>
            </div>

            {/* College Students */}
            <div className="group p-10 bg-white dark:bg-gray-900 rounded-3xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white">College Students</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-center">
                Dominate college with advanced study tools
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>80MB+ textbooks & research papers</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Essay writing with smart citations</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Research-backed mind maps</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>arXiv paper analysis</span>
                </li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  "Large textbook → Interactive study guide"
                </p>
              </div>
            </div>

            {/* Professionals */}
            <div className="group p-10 bg-white dark:bg-gray-900 rounded-3xl border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white">Professionals</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-center">
                Advance your career with smart learning
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Certification prep (AWS, PMP, CPA)</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Listen to podcasts during commute</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Technical manual Q&A chat</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>83% lower cost vs competitors</span>
                </li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  "Prepare for certifications on your commute"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionsCarousel />

      {/* How Synaptic Compares Section */}
      <section className="pt-16 pb-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              How Synaptic Compares
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
              More features, better pricing, superior technology
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
              <thead>
                <tr className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left p-6 font-bold text-black dark:text-white">Feature</th>
                  <th className="text-center p-6 font-bold text-purple-600 dark:text-purple-400">
                    <div className="flex items-center justify-center gap-2">
                      <Brain className="w-5 h-5" />
                      Synaptic
                    </div>
                  </th>
                  <th className="text-center p-6 font-semibold text-gray-600 dark:text-gray-400">Quizlet</th>
                  <th className="text-center p-6 font-semibold text-gray-600 dark:text-gray-400">Notion AI</th>
                  <th className="text-center p-6 font-semibold text-gray-600 dark:text-gray-400">Speechify</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Smart Flashcards</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Mock Exams</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Audio Podcasts</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Interactive Mind Maps</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">YouTube Integration</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Document Size Limit</td>
                  <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">80MB+</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">N/A</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">20MB</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">100MB</td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">Spaced Repetition</td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                  <td className="p-4 text-center text-gray-400 dark:text-gray-600">✗</td>
                </tr>
                <tr className="bg-purple-50 dark:bg-purple-900/20">
                  <td className="p-4 font-bold text-gray-900 dark:text-white">Starting Price (Monthly)</td>
                  <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">Free*</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">$7.99</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">$10</td>
                  <td className="p-4 text-center text-gray-600 dark:text-gray-400">$11.58</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              *Free tier includes 3 flashcard sets, 2 podcasts, and 2 mind maps per month
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Start free, upgrade anytime. No hidden fees, cancel whenever you want.
            </p>
          </div>

          {/* Pricing Carousel */}
          <PricingCarousel />
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
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-6 leading-tight">
                Ready to Transform
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                  Your Learning?
                </span>
              </h2>

              {/* Subheadline with social proof */}
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                Use 12 powerful tools to ace exams, save time, and study 83% cheaper than competitors
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
            </div>
          </div>
        </div>
      </section>

      {/* QR Code & Footer Section */}
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: QR Code */}
            <div className="flex flex-col items-center md:items-start space-y-4">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Share Synaptic
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                  Scan the QR code or download it to share Synaptic with friends, classmates, or on social media.
                </p>
              </div>
              <QRCodeGenerator
                url="https://synaptic.study"
                size={200}
                logoSize={50}
                filename="synaptic-qr-code.png"
                showDownload={true}
                className="mx-auto md:mx-0"
              />
            </div>

            {/* Right: Quick Links & Info */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Get Started Today
                </h4>
                <div className="space-y-2">
                  <Link
                    href="/sign-up"
                    className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    → Create a free account
                  </Link>
                  <Link
                    href="/sign-in"
                    className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    → Sign in to your account
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    → Go to Dashboard
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Contact Us
                </h4>
                <div className="space-y-3">
                  <a
                    href="mailto:support@synaptic.study"
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>support@synaptic.study</span>
                  </a>
                  <a
                    href="tel:+18254368969"
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>+1 (825) 436-8969</span>
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <strong className="text-gray-700 dark:text-gray-300">About Synaptic:</strong> Intelligent personalized learning platform featuring flashcards, interactive chat, podcasts, mind maps, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Copyright Footer */}
      <footer className="py-6 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © 2025 Synaptic. All rights reserved. ካንእ
          </p>
        </div>
      </footer>
    </div>
  )
}
