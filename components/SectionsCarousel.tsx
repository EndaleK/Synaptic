"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  Brain,
  Database,
  TrendingDown,
  Star,
  GraduationCap,
  BookOpen,
  Briefcase,
  FileText,
  Award,
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  ClipboardCheck,
  Youtube,
  Network,
  Mic,
  PenTool,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

export function SectionsCarousel() {
  const { isSignedIn } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)

  const sections = [
    {
      id: "proven-results",
      title: "Proven Results",
      content: (
        <div className="py-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Proven Results, Trusted by Thousands
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Join learners who are already studying smarter with Synaptic
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <p className="text-4xl font-bold text-black dark:text-white">80MB+</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Documents Supported</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">vs competitors&apos; 20MB limits</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                <p className="text-4xl font-bold text-black dark:text-white">83%</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Cheaper Audio Generation</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">Premium TTS at fraction of cost</p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* High School Student Testimonial */}
            <div className="relative p-8 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all">
              <Star className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed">
                &quot;Synaptic helped me raise my SAT score by 200 points. The mock exams felt just like the real thing!&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-black dark:text-white">Sarah M.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">High School Senior</p>
                </div>
              </div>
            </div>

            {/* College Student Testimonial */}
            <div className="relative p-8 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-900 rounded-2xl border border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all">
              <Star className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed">
                &quot;I turned my 600-page biochemistry textbook into flashcards in minutes. Cut my study time in half!&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-black dark:text-white">James K.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">College Junior</p>
                </div>
              </div>
            </div>

            {/* Professional Testimonial */}
            <div className="relative p-8 bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-gray-900 rounded-2xl border border-green-200 dark:border-green-800 hover:shadow-xl transition-all">
              <Star className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed">
                &quot;Passed my AWS certification on the first try. The podcast feature made commute time productive.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-black dark:text-white">Gudu Kassa</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Software Engineer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Research Citation Box */}
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-orange-200 dark:border-orange-800 p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-xl md:text-2xl lg:text-3xl font-bold text-black dark:text-white mb-3">
                  Built on Scientific Research
                </h4>
                <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  Our mind mapping feature is backed by peer-reviewed research showing significantly improved comprehension and retention compared to traditional note-taking methods (Nesbit & Adesope, 2006).
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-orange-300 dark:border-orange-700">
                    <Award className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Peer-Reviewed</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-orange-300 dark:border-orange-700">
                    <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proven Effectiveness</span>
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-orange-300 dark:border-orange-700">
                    <Brain className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cognitive Science</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "how-it-works",
      title: "How It Works",
      content: (
        <div className="relative py-8">
          {/* Animated background mesh */}
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-300/20 via-pink-300/20 to-purple-300/20 dark:from-purple-600/10 dark:via-pink-600/10 dark:to-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            {/* Section Header */}
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Simple & Powerful
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
                How It Works
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Get started in four simple steps and transform how you learn
              </p>
            </div>

            {/* Steps Container with Progress Line */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {/* Animated Progress Line (desktop only) */}
              <div className="hidden lg:block absolute top-16 left-0 right-0 h-1 -z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 dark:from-purple-800 dark:via-pink-800 dark:to-purple-800 rounded-full" />
                <div className="absolute left-[12.5%] top-1/2 w-3 h-3 -mt-1.5 bg-purple-500 rounded-full animate-pulse" />
                <div className="absolute left-[37.5%] top-1/2 w-3 h-3 -mt-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="absolute left-[62.5%] top-1/2 w-3 h-3 -mt-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                <div className="absolute left-[87.5%] top-1/2 w-3 h-3 -mt-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.9s' }} />
              </div>

              {/* Step 1: Discover Your Learning Style */}
              <div className="group relative">
                <div className="relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
                  {/* Glass overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />

                  {/* Icon Badge */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                      1
                    </div>
                  </div>

                  <div className="relative text-center">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                      Discover Your Style
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Take a 2-minute quiz to identify your learning preferences (visual, auditory, or kinesthetic)
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload Any Content */}
              <div className="group relative">
                <div className="relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-pink-200/50 dark:border-pink-800/50 hover:border-pink-400 dark:hover:border-pink-600 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-2">
                  {/* Glass overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 rounded-3xl" />

                  {/* Icon Badge */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Database className="w-8 h-8 text-white" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                      2
                    </div>
                  </div>

                  <div className="relative text-center">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                      Upload Any Content
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      PDFs, YouTube URLs, arXiv papers, or 80MB+ textbooks—we handle it all
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Choose Your Tool */}
              <div className="group relative">
                <div className="relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2">
                  {/* Glass overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl" />

                  {/* Icon Badge */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                      3
                    </div>
                  </div>

                  <div className="relative text-center">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                      Choose Your Tool
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Pick from 12 tools: Flashcards, Chat, Podcasts, Mind Maps, Mock Exams, Video, Writing, Study Guide, Quick Summary, Study Buddy, or Quiz
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Study Smarter */}
              <div className="group relative">
                <div className="relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl border border-pink-200/50 dark:border-pink-800/50 hover:border-pink-400 dark:hover:border-pink-600 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 hover:-translate-y-2">
                  {/* Glass overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 rounded-3xl" />

                  {/* Icon Badge */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/30 group-hover:scale-110 transition-transform duration-300">
                      <PenTool className="w-8 h-8 text-white" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center text-sm font-bold text-white dark:text-black shadow-lg">
                      4
                    </div>
                  </div>

                  <div className="relative text-center">
                    <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                      Study Smarter
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Track your progress with spaced repetition, analytics, and adaptive learning
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "real-world-workflows",
      title: "Real-World Workflows",
      content: (
        <div className="py-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4">
              Real-World Workflows
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              See how Synaptic transforms your learning materials into powerful study tools in minutes
            </p>
          </div>

          {/* Use Case Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1: YouTube → Practice Exam */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="p-8">
                {/* Workflow Diagram */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl shadow-lg">
                    <Youtube className="w-8 h-8 text-white" />
                  </div>
                  <ArrowRight className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-pulse" />
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                    <ClipboardCheck className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3 text-center">
                  YouTube → Practice Exam
                </h3>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-center leading-relaxed">
                  Paste a YouTube lecture URL, and Synaptic generates a full practice exam in under 5 minutes
                </p>

                {/* Steps List */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Extract transcript from video</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Synaptic analyzes key concepts</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Generate multiple-choice questions</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Take test with instant feedback</span>
                  </div>
                </div>

                {/* Example Badge */}
                <div className="bg-purple-100 dark:bg-purple-900/50 rounded-xl p-3 text-center border border-purple-300 dark:border-purple-700">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    Perfect for: SAT prep, AP reviews, certification practice
                  </p>
                </div>
              </div>
            </div>

            {/* Use Case 2: Textbook → Mind Map */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-3xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="p-8">
                {/* Workflow Diagram */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                    <Database className="w-8 h-8 text-white" />
                  </div>
                  <ArrowRight className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg">
                    <Network className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3 text-center">
                  Large Textbook → Mind Map
                </h3>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-center leading-relaxed">
                  Upload massive textbooks and visualize complex relationships between concepts instantly
                </p>

                {/* Steps List */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Upload 80MB+ PDF textbook</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Chunked processing handles large files</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Auto-maps concept hierarchies</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Interactive visualization with cross-links</span>
                  </div>
                </div>

                {/* Example Badge */}
                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-xl p-3 text-center border border-blue-300 dark:border-blue-700">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Perfect for: College courses, research papers, technical manuals
                  </p>
                </div>
              </div>
            </div>

            {/* Use Case 3: Manual → Podcast */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="p-8">
                {/* Workflow Diagram */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <ArrowRight className="w-8 h-8 text-green-600 dark:text-green-400 animate-pulse" />
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3 text-center">
                  Training Manual → Podcast
                </h3>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-center leading-relaxed">
                  Transform dense technical documentation into an engaging audio podcast for your commute
                </p>

                {/* Steps List */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Upload certification or training manual</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Auto-generates conversational script</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Natural-sounding TTS generation</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Listen anywhere, anytime (83% cheaper)</span>
                  </div>
                </div>

                {/* Example Badge */}
                <div className="bg-green-100 dark:bg-green-900/50 rounded-xl p-3 text-center border border-green-300 dark:border-green-700">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                    Perfect for: AWS/PMP/CPA prep, technical onboarding, compliance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              These are just 3 examples—combine our 12 tools in countless ways to match your workflow
            </p>
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-in"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
            >
              <Sparkles className="w-5 h-5" />
              Try It Yourself - Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )
    }
  ]

  return (
    <section className="relative pt-16 pb-8 bg-white dark:bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Carousel Navigation - Desktop */}
        <div className="hidden md:flex justify-center items-center gap-4 mb-12">
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
            aria-label="Previous section"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </button>

          {/* Section Indicators */}
          <div className="flex items-center gap-3">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setCurrentSlide(index)}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  currentSlide === index
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide(Math.min(sections.length - 1, currentSlide + 1))}
            disabled={currentSlide === sections.length - 1}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
            aria-label="Next section"
          >
            <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </button>
        </div>

        {/* Carousel Navigation - Mobile */}
        <div className="md:hidden flex justify-between items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {sections.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentSlide === index
                    ? 'bg-purple-600 w-8'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
                aria-label={`Go to section ${index + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide(Math.min(sections.length - 1, currentSlide + 1))}
            disabled={currentSlide === sections.length - 1}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
          >
            Next →
          </button>
        </div>

        {/* Carousel Container */}
        <div className="relative min-h-[600px]">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {sections.map((section) => (
                <div key={section.id} className="w-full flex-shrink-0 px-4">
                  {section.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
