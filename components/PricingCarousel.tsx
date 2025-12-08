"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Check, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react"

export function PricingCarousel() {
  const { isSignedIn } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)

  // Pricing tiers data
  const pricingTiers = [
    {
      id: "free",
      name: "Free",
      description: "Perfect for trying out Synaptic",
      price: "$0",
      period: "",
      billedAs: "",
      savings: "",
      badge: null,
      popular: false,
      features: [
        "10 documents per month",
        "100 flashcards per month",
        "50 chat messages per month",
        "5 AI-generated podcasts",
        "10 mind maps per month",
        "Community support"
      ],
      cta: isSignedIn ? "Current Plan" : "Get Started",
      href: isSignedIn ? "/dashboard" : "/sign-up",
      bgClass: "bg-gray-50 dark:bg-gray-900",
      borderClass: "border-2 border-gray-200 dark:border-gray-800",
      textClass: "text-black dark:text-white",
      subtextClass: "text-gray-600 dark:text-gray-400",
      checkClass: "text-green-600 dark:text-green-400",
      buttonClass: "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
    },
    {
      id: "student",
      name: "Student",
      description: "Valid .edu email required",
      price: "$6.99",
      period: "/month",
      billedAs: "Billed annually at $83.88",
      savings: "💰 Save $35.88 with student discount!",
      badge: { icon: GraduationCap, text: "Most Popular", class: "bg-gradient-to-r from-gray-600 to-black dark:from-gray-400 dark:to-white text-white dark:text-black" },
      popular: true,
      features: [
        "Unlimited everything",
        "All 12 AI-powered tools",
        "Priority AI processing",
        "Export to all formats",
        "Priority support",
        "Early access to new features"
      ],
      cta: "Start Free Trial",
      href: "/pricing",
      bgClass: "bg-black dark:bg-white",
      borderClass: "border-2 border-black dark:border-white shadow-2xl",
      textClass: "text-white dark:text-black",
      subtextClass: "text-gray-300 dark:text-gray-700",
      checkClass: "text-white dark:text-black",
      buttonClass: "bg-white dark:bg-black text-black dark:text-white hover:scale-105",
      savingsClass: "text-green-300 dark:text-green-600"
    },
    {
      id: "monthly",
      name: "Monthly",
      description: "Flexible month-to-month",
      price: "$9.99",
      period: "/month",
      billedAs: "Billed monthly",
      savings: "",
      badge: null,
      popular: false,
      features: [
        "Unlimited documents",
        "Unlimited flashcards",
        "Unlimited podcasts & mind maps",
        "Priority AI processing",
        "Export to multiple formats",
        "Priority email support"
      ],
      cta: "Start Free Trial",
      href: "/pricing",
      bgClass: "bg-gray-50 dark:bg-gray-900",
      borderClass: "border-2 border-gray-200 dark:border-gray-800",
      textClass: "text-black dark:text-white",
      subtextClass: "text-gray-600 dark:text-gray-400",
      checkClass: "text-green-600 dark:text-green-400",
      buttonClass: "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
    },
    {
      id: "yearly",
      name: "Yearly",
      description: "Best value for committed learners",
      price: "$7.99",
      period: "/month",
      billedAs: "Billed annually at $95.88",
      savings: "💰 Save $23.88 - like 2+ months free!",
      badge: { text: "20% OFF", class: "bg-green-600 dark:bg-green-500 text-white" },
      popular: false,
      features: [
        "Unlimited documents",
        "Unlimited flashcards",
        "Unlimited podcasts & mind maps",
        "Priority AI processing",
        "Export to multiple formats",
        "Priority email support"
      ],
      cta: "Start Free Trial",
      href: "/pricing",
      bgClass: "bg-gray-50 dark:bg-gray-900",
      borderClass: "border-2 border-gray-200 dark:border-gray-800",
      textClass: "text-black dark:text-white",
      subtextClass: "text-gray-600 dark:text-gray-400",
      checkClass: "text-green-600 dark:text-green-400",
      buttonClass: "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200",
      savingsClass: "text-green-600 dark:text-green-400"
    }
  ]

  // Group tiers into slides: Desktop shows 2 cards per slide, Mobile shows 1
  const slides = [
    [pricingTiers[0], pricingTiers[1]], // Free + Student
    [pricingTiers[2], pricingTiers[3]]  // Monthly + Yearly
  ]

  const totalSlides = slides.length

  return (
    <div className="relative">
      {/* Carousel Navigation - Desktop */}
      <div className="hidden md:flex justify-center items-center gap-4 mb-12">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
          aria-label="Previous pricing plans"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
        </button>

        {/* Slide Indicators */}
        <div className="flex items-center gap-3">
          {['Free & Student', 'Monthly & Yearly'].map((title, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                currentSlide === index
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {title}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
          disabled={currentSlide === totalSlides - 1}
          className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
          aria-label="Next pricing plans"
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
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentSlide === index
                  ? 'bg-purple-600 w-8'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentSlide(Math.min(totalSlides - 1, currentSlide + 1))}
          disabled={currentSlide === totalSlides - 1}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
        >
          Next →
        </button>
      </div>

      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slideTiers, slideIndex) => (
            <div key={slideIndex} className="w-full flex-shrink-0">
              {/* Desktop: 2 cards side by side, Mobile: 1 card stacked */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 pt-6">
                {slideTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`relative rounded-3xl p-8 min-h-[520px] flex flex-col ${tier.bgClass} ${tier.borderClass}`}
                  >
                    {/* Badge (Most Popular or 20% OFF) */}
                    {tier.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className={`inline-flex items-center gap-1 px-4 py-1.5 ${tier.badge.class} rounded-full text-sm font-semibold`}>
                          {tier.badge.icon && <tier.badge.icon className="w-4 h-4" />}
                          {tier.badge.text}
                        </div>
                      </div>
                    )}

                    {/* Plan Name & Description */}
                    <div className="mb-4">
                      <h3 className={`text-xl font-bold mb-1 ${tier.textClass}`}>{tier.name}</h3>
                      <p className={`text-sm ${tier.subtextClass}`}>{tier.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className={`text-4xl font-bold ${tier.textClass}`}>{tier.price}</span>
                        {tier.period && (
                          <span className={`text-base ${tier.subtextClass}`}>{tier.period}</span>
                        )}
                      </div>
                      {tier.billedAs && (
                        <p className={`text-xs ${tier.subtextClass}`}>{tier.billedAs}</p>
                      )}
                      {tier.savings && (
                        <p className={`text-xs font-semibold ${tier.savingsClass || 'text-green-600 dark:text-green-400'}`}>
                          {tier.savings}
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-grow">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className={`w-5 h-5 ${tier.checkClass} flex-shrink-0 mt-0.5`} />
                          <span className={`text-sm ${tier.subtextClass}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link
                      href={tier.href}
                      className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all mt-auto ${tier.buttonClass}`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
