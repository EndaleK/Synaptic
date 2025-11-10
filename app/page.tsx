"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { BookOpen, Brain, MessageSquare, Mic, Network, Sparkles, ArrowRight, Check, ClipboardCheck, Youtube, Database, TrendingDown, Users, Award, GraduationCap, Briefcase, Star, FileText, Zap } from "lucide-react"
import Logo from "@/components/Logo"
import { QRCodeGenerator } from "@/components/QRCodeGenerator"

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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="text-center max-w-5xl mx-auto">
            {/* Brand Logo */}
            <div className="mb-2 flex justify-center">
              <img
                src="/logo-full.png"
                alt="Synaptic - Study Smarter"
                width={495}
                height={495}
                className="object-contain w-[360px] h-[360px] sm:w-[450px] sm:h-[450px] md:w-[495px] md:h-[495px]"
              />
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white mb-4 leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-orange">Learning That Adapts to You</span>
              <br />
              <span className="text-black dark:text-white">Eight Intelligent Tools, One Platform</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto leading-relaxed">
              From flashcards to mock exams, podcasts to mind maps—master any subject with Synaptic adapting to your learning style.
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

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                className="group px-8 py-4 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-orange text-white rounded-xl font-semibold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center gap-2 min-w-[220px] justify-center"
              >
                {isSignedIn ? "Go to Dashboard" : "Start Learning Smarter - Free"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-accent-primary dark:text-white border-2 border-accent-secondary/30 dark:border-gray-700 rounded-xl font-semibold text-lg hover:bg-purple-50 dark:hover:bg-gray-700 hover:border-accent-secondary/50 transition-all min-w-[220px] justify-center"
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
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              8 Powerful Learning Tools
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From exam prep to content creation—everything you need to excel in high school, college, and beyond
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Flashcards */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                Smart Flashcards
              </h3>
              <p className="text-xs font-semibold text-accent-primary mb-3">SM-2 Spaced Repetition Algorithm</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Auto-extract key concepts and study with scientifically-proven spaced repetition that knows exactly when to quiz you.
              </p>
            </div>

            {/* Feature 2: Chat */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-blue to-accent-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Socratic Teaching
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Chat with your documents through guided dialogue. Synaptic's adaptive engine asks questions
                to deepen understanding instead of giving direct answers.
              </p>
            </div>

            {/* Feature 3: Podcasts */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-secondary to-accent-orange rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                Audio Learning
              </h3>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3">83% Cheaper Than Competitors</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Convert documents into natural-sounding podcasts. Perfect for learning while commuting, exercising, or multitasking.
              </p>
            </div>

            {/* Feature 4: Mind Maps */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-orange to-accent-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                Mind Mapping
              </h3>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">Research-Backed (0.66 Effect Size)</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Visualize concepts with interactive maps featuring relationship types, cross-links, and knowledge integration indicators.
              </p>
            </div>

            {/* Feature 5: Learning Style */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-primary to-accent-orange rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Adaptive Intelligence
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Take a quick quiz to discover your learning style. The platform
                adapts to emphasize your preferred learning mode.
              </p>
            </div>

            {/* Feature 6: Large Document Support */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-accent-blue to-accent-secondary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                500MB+ Documents
              </h3>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">vs Competitors' 20MB Limits</p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Process massive textbooks, research papers, and training manuals. RAG architecture handles documents others can't.
              </p>
            </div>

            {/* Feature 7: Mock Exam Simulator (NEW) */}
            <div className="group relative p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              {/* NEW badge */}
              <div className="absolute top-4 right-4 px-2 py-1 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-xs font-bold rounded-full">
                NEW
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Mock Exam Simulator
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Automatically generated practice tests with performance analytics. Perfect for SAT, AP exams, certifications, and finals.
              </p>
            </div>

            {/* Feature 8: Video Learning */}
            <div className="group p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:shadow-2xl transition-all border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Youtube className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-3">
                Video Learning
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Extract study materials from YouTube lectures. Generate flashcards, notes, and quizzes from any educational video.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience-Specific Smart Sections */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              Designed for Every Learner
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
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
                  <span>500MB+ textbooks & research papers</span>
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
                  "500-page textbook → Interactive study guide"
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

      {/* Social Proof Section */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              Proven Results, Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Join learners who are already studying smarter with Synaptic
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <p className="text-4xl font-bold text-black dark:text-white">500MB+</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Documents Supported</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">vs competitors' 20MB limits</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                <p className="text-4xl font-bold text-black dark:text-white">83%</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Cheaper Audio Generation</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">Premium TTS at fraction of cost</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                <p className="text-4xl font-bold text-black dark:text-white">0.66</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Research-Backed Design</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Effect size for mind maps</p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* High School Student Testimonial */}
            <div className="relative p-8 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all">
              <Star className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed">
                "Synaptic helped me raise my SAT score by 200 points. The mock exams felt just like the real thing!"
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
                "I turned my 600-page biochemistry textbook into flashcards in minutes. Cut my study time in half!"
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
                "Passed my AWS certification on the first try. The podcast feature made commute time productive."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-black dark:text-white">Michael R.</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Software Engineer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-black dark:text-white mb-2">
                How Synaptic Compares
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
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
                    <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">500MB+</td>
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

          {/* Research Citation Box */}
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-orange-200 dark:border-orange-800 p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-black dark:text-white mb-3">
                  Built on Scientific Research
                </h4>
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  Our mind mapping feature is backed by peer-reviewed research showing a <strong>0.66 effect size</strong> on learning outcomes (Nesbit & Adesope, 2006). This means students using mind maps can expect significantly improved comprehension and retention compared to traditional note-taking methods.
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
                    PDFs, YouTube URLs, arXiv papers, or 500MB+ textbooks—we handle it all
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
                    Pick from 8 tools: Flashcards, Chat, Podcasts, Mind Maps, Mock Exams, Video, Writing, or Quiz
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
                    <Award className="w-8 h-8 text-white" />
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
                    Track progress, ace exams, and master any subject with intelligent insights and analytics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-4">
              Real-World Workflows
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
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
                  500-Page Textbook → Mind Map
                </h3>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-4 text-center leading-relaxed">
                  Upload massive textbooks and visualize complex relationships between concepts instantly
                </p>

                {/* Steps List */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Upload 500MB+ PDF textbook</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>RAG architecture processes chapters</span>
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
              These are just 3 examples—combine our 8 tools in countless ways to match your workflow
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
                Use 8 powerful tools to ace exams, save time, and study 83% cheaper than competitors
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
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
