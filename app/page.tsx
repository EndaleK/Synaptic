"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@clerk/nextjs"
import {
  Sparkles, ArrowRight, ChevronDown, ChevronUp,
  TrendingDown, Award, Star,
  Mail, FileText, Youtube, Search, BookOpen, PenTool,
  Menu, X,
  Home, GraduationCap, Target
} from "lucide-react"
import { PricingCarousel } from "@/components/PricingCarousel"
import {
  CircleHighlight, HighlightedText, InlineAvatar1, InlineAvatar2, InlineAvatar3,
  StudyingStudent,
  FlashcardIcon, ExamIcon, StudyBuddyIcon, PodcastIcon, MindMapIcon, PlannerIcon,
  GraduationIcon, TargetIcon, VerifyIcon, TrophyIcon, UploadIcon, BrainIcon
} from "@/components/illustrations"
import { WaveDivider } from "@/components/backgrounds"
import { SynapticLogo } from "@/components/SynapticLogo"

export default function LandingPage() {
  const { isSignedIn } = useAuth()
  const [showAllTools, setShowAllTools] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-800/50'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center"
            >
              <SynapticLogo size="sm" />
            </button>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('for-you')}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                Pricing
              </button>
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/sign-in"
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-600 dark:text-gray-300 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400'
                }`}
              >
                Sign In
              </Link>
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-up"}
                className="px-5 py-2 bg-[#C4B5FD] hover:bg-[#B794F4] text-[#5B21B6] rounded-xl font-semibold text-sm hover:scale-105 transition-all shadow-md"
              >
                {isSignedIn ? "Dashboard" : "Start Free"}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className={`w-6 h-6 ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`} />
              ) : (
                <Menu className={`w-6 h-6 ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`} />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('for-you')}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                >
                  For You
                </button>
                <button
                  onClick={() => scrollToSection('testimonials')}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                >
                  Testimonials
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                >
                  Pricing
                </button>
                <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-3">
                  <Link
                    href="/sign-in"
                    className="text-gray-700 dark:text-gray-200 hover:text-[#7B3FF2] dark:hover:text-purple-400 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href={isSignedIn ? "/dashboard" : "/sign-up"}
                    className="inline-flex justify-center px-5 py-3 bg-[#C4B5FD] hover:bg-[#B794F4] text-[#5B21B6] rounded-xl font-semibold text-sm transition-all shadow-md"
                  >
                    {isSignedIn ? "Go to Dashboard" : "Start Free"}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-dawn">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated gradient orbs with glow halos */}
          <div className="absolute -top-[15%] -right-[5%] w-[600px] h-[600px] rounded-full bg-purple-300/20 dark:bg-purple-600/15 blur-3xl animate-float-orb" />
          <div className="absolute -bottom-[20%] -left-[5%] w-[500px] h-[500px] rounded-full bg-pink-300/15 dark:bg-pink-600/10 blur-3xl animate-float-orb" style={{ animationDelay: '7s' }} />
          <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-orange-200/10 dark:bg-orange-500/8 blur-3xl animate-float-orb" style={{ animationDelay: '14s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-24 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Text Content with reveal animations */}
            <div className="text-center lg:text-left">
              {/* Headline - Clear, outcome-focused with staggered reveal */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black dark:text-white mb-6 leading-[1.1] tracking-tight animate-section-reveal">
                Study less.
                <br />
                <span className="bg-gradient-to-r from-[#7B3FF2] to-[#E91E8C] bg-clip-text text-transparent">
                  Remember more.
                </span>
                <br />
                <HighlightedText color="yellow">Ace your exams.</HighlightedText>
              </h1>

              {/* Subheadline - Emotional, outcome-focused */}
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-section-reveal stagger-index-1">
                Upload anything from lecture slides to 800-page textbooks. Get flashcards, practice exams, and a study schedule—so you walk into exams confident, not cramming.
              </p>

              {/* CTA Buttons with reveal animation */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center animate-section-reveal stagger-index-2">
                <Link
                  href={isSignedIn ? "/dashboard" : "/sign-up"}
                  className="group relative px-8 py-4 bg-[#C4B5FD] hover:bg-[#B794F4] text-[#5B21B6] rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center gap-2"
                >
                  <span>{isSignedIn ? "Go to Dashboard" : "Start free — no credit card"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-black dark:text-gray-300 border-2 border-black dark:border-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  See how it works
                </button>
              </div>

              {/* Trust Badge */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 mt-6 text-sm text-gray-500 dark:text-gray-400 animate-section-reveal stagger-index-3">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  1M+ flashcards generated
                </span>
                <span className="hidden sm:inline">•</span>
                <span>Free forever plan available</span>
              </div>
            </div>

            {/* Right Column: Studying Student Illustration with reveal animation */}
            <div className="flex justify-center lg:justify-end animate-section-reveal stagger-index-3">
              <StudyingStudent size="lg" className="w-[460px] h-[460px] md:w-[552px] md:h-[552px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider - Hero to How It Works */}
      <WaveDivider variant="curve" className="text-[#FAFBFC] dark:text-[#0A0A0F] -mt-1" />

      {/* How Synaptic Fits Your Week - 3-Step Process */}
      <section id="how-it-works" className="scroll-mt-20 py-20 bg-clarity-zone">
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
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gray-200 dark:bg-gray-700" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <UploadIcon size="lg" className="w-14 h-14" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-[#7B3FF2] flex items-center justify-center text-xs font-bold text-[#7B3FF2] dark:text-purple-400 z-20">
                1
              </div>
              <h3 className="text-xl font-bold text-black dark:text-white mb-3">
                Upload your class stuff
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                PDFs up to 250MB, slides, YouTube lectures, or entire textbooks—no splitting required
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <PlannerIcon size="lg" className="w-14 h-14" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-[#7B3FF2] flex items-center justify-center text-xs font-bold text-[#7B3FF2] dark:text-purple-400 z-20">
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
              <div className="relative z-10 w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <TrophyIcon size="lg" className="w-14 h-14" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-full border-2 border-[#7B3FF2] flex items-center justify-center text-xs font-bold text-[#7B3FF2] dark:text-purple-400 z-20">
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
      <section id="features" className="py-20 bg-showcase">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Everything you need to{" "}
              <HighlightedText color="purple">ace your next exam</HighlightedText>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful study tools that actually help you learn—not just review
            </p>
          </div>

          {/* 6-Tool Grid with Hand-drawn Icons and Emotional Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Smart Flashcards */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <FlashcardIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                <HighlightedText color="purple">Smart Flashcards</HighlightedText>
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Never forget what you studied—flashcards that know when you&apos;re about to forget
              </p>
            </div>

            {/* Mock Exams */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <ExamIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                <HighlightedText color="brand">Mock Exams</HighlightedText>
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Walk in confident—practice exams that feel like the real thing
              </p>
            </div>

            {/* Study Buddy */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <StudyBuddyIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                <HighlightedText color="purple">Study Buddy</HighlightedText>
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Stuck at 2am? Ask anything about your notes and get instant answers
              </p>
            </div>

            {/* Audio Summaries */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <PodcastIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                <HighlightedText color="brand">Audio Summaries</HighlightedText>
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Turn dead time into study time—listen while commuting or exercising
              </p>
            </div>

            {/* Mind Maps */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <MindMapIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                <HighlightedText color="purple">Mind Maps</HighlightedText>
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Finally see the big picture—visualize how concepts connect
              </p>
            </div>

            {/* Study Planner */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
              <div className="mb-4 group-hover:scale-110 transition-transform">
                <PlannerIcon size="lg" />
              </div>
              <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                Study Planner
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Stop guessing what to study—get a personalized daily schedule
              </p>
            </div>

            {/* Course Study Guide Generator */}
            <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1 md:col-span-2 lg:col-span-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="group-hover:scale-110 transition-transform flex-shrink-0">
                  <GraduationIcon size="lg" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-black dark:text-white">
                      Course Study Guide Generator
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[#E91E8C] text-white rounded-full">
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
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="mb-4">
                  <BrainIcon size="md" />
                </div>
                <h4 className="font-semibold text-black dark:text-white mb-2">Spaced repetition</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Reviews scheduled automatically so you retain more with less effort
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="mb-4">
                  <TargetIcon size="md" />
                </div>
                <h4 className="font-semibold text-black dark:text-white mb-2">AI prioritization</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Focus on what matters—AI identifies your weak spots
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="mb-4">
                  <VerifyIcon size="md" />
                </div>
                <h4 className="font-semibold text-black dark:text-white mb-2">Your notes, cited</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Every answer comes from your actual documents—no hallucinations
                </p>
              </div>
            </div>
          </div>

          {/* Why Synaptic - Key Differentiators */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12 mt-8">
            <h3 className="text-xl font-bold text-center text-black dark:text-white mb-8">
              Why students choose Synaptic
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-200 font-medium mb-1">&ldquo;I use 5 different study apps&rdquo;</p>
                <p className="text-xs text-purple-600 dark:text-purple-300">12 tools in one place</p>
              </div>
              <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-800">
                <p className="text-sm text-pink-800 dark:text-pink-200 font-medium mb-1">&ldquo;My textbook is too large&rdquo;</p>
                <p className="text-xs text-pink-600 dark:text-pink-300">250MB+ support, no splitting</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-1">&ldquo;Flashcard apps just quiz me&rdquo;</p>
                <p className="text-xs text-orange-600 dark:text-orange-300">AI that actually teaches</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">&ldquo;I learn better by listening&rdquo;</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">Auto-generated podcasts</p>
              </div>
            </div>
          </div>

          {/* Additional Tools - Hidden by default */}
          {showAllTools && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 animate-fade-up">
              {/* Document Import */}
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-12 h-12 text-[#7B3FF2]" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  Document Import
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Upload entire textbooks (up to 250MB)—no more splitting PDFs
                </p>
              </div>

              {/* YouTube Learning */}
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <Youtube className="w-12 h-12 text-[#7B3FF2]" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  YouTube Learning
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Turn any YouTube video into study materials instantly
                </p>
              </div>

              {/* Smart Search */}
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-12 h-12 text-[#7B3FF2]" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  Smart Search
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Find anything in your notes with AI-powered search
                </p>
              </div>

              {/* Quick Summaries */}
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-12 h-12 text-[#7B3FF2]" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  Quick Summaries
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Get the key points from any document in seconds
                </p>
              </div>

              {/* Writing Assistant */}
              <div className="group p-6 bg-white dark:bg-gray-800 rounded-2xl hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 card-glow card-level-1">
                <div className="mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="w-12 h-12 text-[#7B3FF2]" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white mb-2">
                  Writing Assistant
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Essay help with citations and structure suggestions
                </p>
              </div>
            </div>
          )}

          {/* See all tools button */}
          <div className="text-center mt-10">
            <button
              onClick={() => setShowAllTools(!showAllTools)}
              className="inline-flex items-center gap-2 text-black dark:text-white font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {showAllTools ? "Show less" : "See more tools included"}
              {showAllTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* For You - Empathetic Multi-Audience Section */}
      <section id="for-you" className="scroll-mt-20 py-20 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
              We get it. Learning is <HighlightedText color="purple">personal</HighlightedText>.
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Whether you&apos;re pulling an all-nighter or teaching your kids at 7am
            </p>
          </div>

          {/* 3-column grid for current audiences */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Students */}
            <div className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  Students
                </h3>
              </div>
              <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                &ldquo;It&apos;s 2am and the exam is tomorrow&rdquo;
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                You&apos;ve got 300 pages to review and no time to waste. Upload your notes, get flashcards in minutes, and focus on what you don&apos;t know yet.
              </p>
              <Link
                href="/sign-up?role=learner"
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Upload your notes
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Self-Learners */}
            <div className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-orange-300 dark:hover:border-orange-600 transition-all flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  Self-Learners
                </h3>
              </div>
              <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                &ldquo;Learning on your own schedule&rdquo;
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                No classroom. No deadlines. Just you and your curiosity. Turn any book, video, or article into study materials that stick.
              </p>
              <Link
                href="/sign-up?role=learner"
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Start learning now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Homeschool Parents */}
            <div className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-600 transition-all flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  Homeschool Parents
                </h3>
              </div>
              <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                &ldquo;Teaching 3 subjects before lunch&rdquo;
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                Homeschooling is a superpower, but it&apos;s exhausting. Let AI handle the flashcards while you focus on being the teacher your kids need.
              </p>
              <Link
                href="/sign-up?role=parent"
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Create your first lesson
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Full-width card for Schools & Educators */}
          <div className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-black dark:text-white">
                  Schools & Educators
                </h3>
              </div>

              <div className="flex-1">
                <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                  &ldquo;30 students, 30 different learning speeds&rdquo;
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  You can&apos;t clone yourself, but you can give every student personalized study materials. Class management, assignments, and progress tracking included.
                </p>
              </div>

              <Link
                href="/sign-up?role=educator"
                className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Try it with your class
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider - Features to Testimonials */}
      <WaveDivider variant="flow" className="text-[#FEFDFB] dark:text-[#0B0A0A] -mt-1" />

      {/* Proof It Works - Testimonials Section */}
      <section id="testimonials" className="scroll-mt-20 py-16 bg-trust bg-vignette">
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
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "Went from a 68% to 86% in biology in one month. The mock exams are scary accurate."
              </p>
              <div className="flex items-center gap-3">
                <InlineAvatar1 size="sm" className="flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">Sarah M.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pre-Med Student</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "My 600-page biochemistry textbook became flashcards in 5 minutes. Game changer."
              </p>
              <div className="flex items-center gap-3">
                <InlineAvatar2 size="sm" className="flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-black dark:text-white">James K.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">College Junior</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 leading-relaxed italic">
                "Passed AWS certification on my first try. Listened to podcasts during my commute."
              </p>
              <div className="flex items-center gap-3">
                <InlineAvatar3 size="sm" className="flex-shrink-0" />
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
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <CircleHighlight color="yellow">1M+</CircleHighlight> flashcards generated
              </span>
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
      <section id="pricing" className="py-24 bg-decision">
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
      <section className="relative py-20 overflow-hidden bg-energy-burst border-y border-purple-100/50 dark:border-purple-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Illustration */}
            <div className="hidden lg:flex justify-center">
              <StudyingStudent size="lg" variant="reading-side" className="w-[416px] h-[416px]" />
            </div>

            {/* Right: CTA Content */}
            <div className="text-center lg:text-left">
              {/* Headline - Student-focused */}
              <h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">
                Ready to actually{" "}
                <HighlightedText color="brand">enjoy studying</HighlightedText>?
              </h2>

              {/* Subheadline */}
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0">
                Join students worldwide who stopped stressing and started succeeding.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <Link
                  href={isSignedIn ? "/dashboard" : "/sign-up"}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-[#C4B5FD] hover:bg-[#B794F4] text-[#5B21B6] rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl"
                >
                  <span>{isSignedIn ? "Go to Dashboard" : "Start free — no credit card"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a
                  href="mailto:support@synaptic.study"
                  className="inline-flex items-center gap-2 px-6 py-4 text-gray-600 dark:text-gray-400 font-medium hover:text-[#7B3FF2] dark:hover:text-purple-400 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Questions? Chat with us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Contact Info */}
      <footer className="py-12 bg-grounded border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand & Integrity */}
            <div className="text-center md:text-left">
              <h3 className="font-bold text-black dark:text-white mb-2">Synaptic</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your notes stay yours. We support honest studying, not shortcuts.
              </p>
            </div>

            {/* Contact Information */}
            <div className="text-center">
              <h3 className="font-bold text-black dark:text-white mb-2">Contact Us</h3>
              <div className="space-y-2">
                <a
                  href="mailto:support@synaptic.study"
                  className="flex items-center justify-center md:justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#7B3FF2] dark:hover:text-purple-400 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  support@synaptic.study
                </a>
                <a
                  href="mailto:hello@synaptic.study"
                  className="flex items-center justify-center md:justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#7B3FF2] dark:hover:text-purple-400 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  hello@synaptic.study
                </a>
              </div>
            </div>

            {/* Links */}
            <div className="text-center md:text-right">
              <h3 className="font-bold text-black dark:text-white mb-2">Legal</h3>
              <div className="space-y-2">
                <Link
                  href="/privacy"
                  className="block text-sm text-gray-600 dark:text-gray-400 hover:text-[#7B3FF2] dark:hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="block text-sm text-gray-600 dark:text-gray-400 hover:text-[#7B3FF2] dark:hover:text-purple-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              © 2025 Synaptic. ካንአ All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
