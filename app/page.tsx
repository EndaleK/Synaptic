"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  BookOpen, Brain, Mic, Network, Sparkles, ArrowRight,
  ClipboardCheck, TrendingDown, Award, Star,
  Bot, Upload, Calendar, Trophy, Target, FileCheck2, Mail, GraduationCap
} from "lucide-react"
import { PricingCarousel } from "@/components/PricingCarousel"

// Transformation Visual Component - Static before/after illustration
function TransformationVisual() {
  return (
    <div className="flex items-center justify-center gap-6 md:gap-10">
      {/* Before: Messy stack of documents */}
      <div className="relative w-28 h-36 md:w-40 md:h-48">
        {/* Stacked, rotated document shapes */}
        <div className="absolute w-full h-28 md:h-36 bg-gray-200 dark:bg-gray-700 rounded-lg rotate-[-8deg] shadow-md border border-gray-300 dark:border-gray-600" />
        <div className="absolute w-full h-28 md:h-36 bg-gray-100 dark:bg-gray-600 rounded-lg rotate-[4deg] shadow-md top-2 border border-gray-200 dark:border-gray-500" />
        <div className="absolute w-full h-28 md:h-36 bg-white dark:bg-gray-800 rounded-lg rotate-[-2deg] shadow-lg top-4 border border-gray-200 dark:border-gray-700 p-2">
          {/* Fake text lines */}
          <div className="space-y-1.5">
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-4/5" />
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full" />
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full" />
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
          </div>
        </div>
        {/* Label */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
          Your notes
        </div>
      </div>

      {/* Arrow */}
      <div className="flex flex-col items-center gap-1">
        <ArrowRight className="w-8 h-8 md:w-10 md:h-10 text-purple-500 dark:text-purple-400" />
        <span className="text-xs text-gray-400 dark:text-gray-500">Synaptic</span>
      </div>

      {/* After: Clean organized dashboard */}
      <div className="w-36 h-44 md:w-52 md:h-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 md:p-4 space-y-2 md:space-y-3">
        {/* Header bar */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Brain className="w-3 h-3 md:w-4 md:h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16 md:w-20" />
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[8px] md:text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>75%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-2 w-3/4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
          </div>
        </div>

        {/* Mini flashcard */}
        <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-2 border border-indigo-100 dark:border-indigo-800">
          <div className="h-1.5 bg-indigo-200 dark:bg-indigo-700 rounded w-full mb-1" />
          <div className="h-1.5 bg-indigo-200 dark:bg-indigo-700 rounded w-2/3" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-1.5 md:p-2 text-center border border-green-100 dark:border-green-800">
            <div className="text-[10px] md:text-xs font-bold text-green-600 dark:text-green-400">24</div>
            <div className="text-[8px] text-green-500 dark:text-green-500">Cards</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-1.5 md:p-2 text-center border border-blue-100 dark:border-blue-800">
            <div className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400">A+</div>
            <div className="text-[8px] text-blue-500 dark:text-blue-500">Ready</div>
          </div>
        </div>

        {/* Label */}
        <div className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 pt-1">
          Exam-ready
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Hero Section - Student-First Design */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50/80 via-white to-white dark:from-purple-950/50 dark:via-black dark:to-black">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-grid-purple/[0.02] dark:bg-grid-white/[0.01]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200/30 dark:bg-purple-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-pink-200/30 dark:bg-pink-800/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left">
              {/* Headline - Clear, outcome-focused */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-6 leading-[1.1] tracking-tight">
                Study less.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35]">
                  Remember more.
                </span>
                <br />
                Ace your exams.
              </h1>

              {/* Subheadline - Emotional, outcome-focused */}
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Upload your notes once. Get flashcards, practice exams, and a study schedule—so you walk into exams confident, not cramming.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <Link
                  href={isSignedIn ? "/dashboard" : "/sign-up"}
                  className="group relative px-8 py-4 bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35] text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center gap-2"
                >
                  <span>{isSignedIn ? "Go to Dashboard" : "Start free"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
                >
                  See how it works
                </button>
              </div>

              {/* CTA Microcopy */}
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center lg:text-left">
                No credit card required. Cancel anytime.
              </p>

              {/* Trust Band - Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">10,000+</span> students
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">1M+</span> flashcards
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-900 dark:text-white">4.8</span> rating
                </div>
              </div>
            </div>

            {/* Right Column: Transformation Visual */}
            <div className="flex justify-center lg:justify-end">
              <TransformationVisual />
            </div>
          </div>
        </div>
      </section>

      {/* How Synaptic Fits Your Week - 3-Step Process */}
      <section id="how-it-works" className="scroll-mt-20 py-20 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              How Synaptic Fits Your Week
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From overwhelmed to exam-ready in three simple steps
            </p>
          </div>

          {/* 3-Step Process */}
          <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300 dark:from-purple-700 dark:via-pink-700 dark:to-orange-700" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-purple-500 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 z-20">
                1
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Upload your class stuff
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                PDFs, slides, YouTube lectures, or textbook chapters
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-pink-500 flex items-center justify-center text-xs font-bold text-pink-600 dark:text-pink-400 z-20">
                2
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Get a personalized plan
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                AI figures out what you need to study and when
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-orange-500 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-400 z-20">
                3
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Practice until you&apos;re exam-ready
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Flashcards, mock exams, and progress tracking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get - Tools + Benefits Combined */}
      <section id="features" className="py-20 bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-black dark:via-purple-950/30 dark:to-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Everything you need to ace your next exam
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful study tools that actually help you learn—not just review
            </p>
          </div>

          {/* 6-Tool Grid with Emotional Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Smart Flashcards */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Smart Flashcards
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Never forget what you studied—flashcards that know when you're about to forget
              </p>
            </div>

            {/* Mock Exams */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Mock Exams
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Walk in confident—practice exams that feel like the real thing
              </p>
            </div>

            {/* Study Buddy */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Study Buddy
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Stuck at 2am? Ask anything about your notes and get instant answers
              </p>
            </div>

            {/* Audio Summaries */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Audio Summaries
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Turn dead time into study time—listen while commuting or exercising
              </p>
            </div>

            {/* Mind Maps */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Network className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Mind Maps
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Finally see the big picture—visualize how concepts connect
              </p>
            </div>

            {/* Study Planner */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Study Planner
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Stop guessing what to study—get a personalized daily schedule
              </p>
            </div>

            {/* Course Study Guide Generator */}
            <div className="group p-6 bg-white dark:bg-gray-900 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-800 md:col-span-2 lg:col-span-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-black dark:text-white">
                      Course Study Guide Generator
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full">
                      NEW
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    Enter your university and course name—get a complete 14-week syllabus with textbook recommendations, weekly topics, and study materials. Powered by real course data from 500+ institutions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Why It Works - Benefits Subsection */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <h3 className="text-xl font-bold text-center text-black dark:text-white mb-8">
              Why it actually works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Benefit 1 */}
              <div className="flex items-start gap-4 p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-black dark:text-white mb-1">Spaced repetition</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Reviews scheduled automatically so you retain more with less effort
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-black dark:text-white mb-1">AI prioritization</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Focus on what matters—AI identifies your weak spots
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-start gap-4 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-xl">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileCheck2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-black dark:text-white mb-1">Your notes, cited</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Every answer comes from your actual documents—no hallucinations
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* See all tools link */}
          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              See all 12 tools included
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proof It Works - Testimonials Section */}
      <section className="py-16 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Proof It Works
            </h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Testimonial 1 */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "Went from a 68% to 86% in biology in one month. The mock exams are scary accurate."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-sm">
                  SM
                </div>
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">Sarah M.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pre-Med Student</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "My 600-page biochemistry textbook became flashcards in 5 minutes. Game changer."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">
                  JK
                </div>
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">James K.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">College Junior</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "Passed AWS certification on my first try. Listened to podcasts during my commute."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-green-600 dark:text-green-300 font-bold text-sm">
                  GK
                </div>
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">Gudu K.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Software Engineer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">1M+ flashcards generated</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">83% average cost savings</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Award className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Research-backed methods</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-purple-50/20 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/30">
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

      {/* Final CTA Section - Student-Focused */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/50 dark:to-black border-y border-purple-100 dark:border-purple-900">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-purple/[0.02] dark:bg-grid-white/[0.01]" />
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-200/30 dark:bg-purple-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-pink-200/20 dark:bg-pink-800/10 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Headline - Student-focused */}
          <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
            Ready to actually enjoy studying?
          </h2>

          {/* Subheadline */}
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Join students worldwide who stopped stressing and started succeeding.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-up"}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#7B3FF2] via-[#E91E8C] to-[#FF6B35] text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl"
            >
              <span>{isSignedIn ? "Go to Dashboard" : "Start free — no credit card"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="mailto:support@synaptic.study"
              className="inline-flex items-center gap-2 px-6 py-4 text-gray-600 dark:text-gray-400 font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Questions? Chat with us
            </a>
          </div>
        </div>
      </section>

      {/* Footer with Integrity Statement */}
      <footer className="py-10 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Integrity Statement */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            Your notes stay yours. Synaptic supports honest studying, not shortcuts.
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link
              href="/privacy"
              className="text-sm text-gray-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:support@synaptic.study"
              className="text-sm text-gray-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Support
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2025 Synaptic. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
