"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { Check, Sparkles } from "lucide-react"

export default function PricingPage() {
  const { isSignedIn } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState(false)

  // TODO: Replace with your actual Stripe Price ID from dashboard
  // Follow STRIPE_SETUP_GUIDE.md Step 3 to get your Price ID
  const STRIPE_PRICE_ID = 'price_YOUR_ACTUAL_PRICE_ID'

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-up'
      return
    }

    if (STRIPE_PRICE_ID === 'price_YOUR_ACTUAL_PRICE_ID') {
      alert('Please configure your Stripe Price ID first. See STRIPE_SETUP_GUIDE.md for instructions.')
      return
    }

    setIsUpgrading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: STRIPE_PRICE_ID,
          tier: 'premium'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again.')
      setIsUpgrading(false)
    }
  }

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for trying out AI learning",
      features: [
        "10 documents per month",
        "Smart flashcard generation",
        "Document chat with AI",
        "Basic learning style assessment",
        "Export flashcards as JSON",
        "Community support",
      ],
      cta: isSignedIn ? "Current Plan" : "Get Started",
      href: isSignedIn ? "/dashboard" : "/sign-up",
      popular: false,
      isPremium: false,
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "/month",
      description: "For serious learners who want it all",
      features: [
        "Unlimited documents",
        "All Free features",
        "Podcast generation with AI voice",
        "Interactive mind maps",
        "Advanced Socratic teaching mode",
        "Spaced repetition algorithm",
        "Priority AI processing",
        "Export to multiple formats",
        "Priority email support",
        "Early access to new features",
      ],
      cta: "Start Free Trial",
      href: isSignedIn ? "/dashboard?upgrade=true" : "/sign-up",
      popular: true,
      isPremium: true,
    },
  ]

  return (
    <div className="min-h-screen py-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-black dark:text-white mb-6">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Start free, upgrade anytime. No hidden fees, cancel whenever you want.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl p-8 ${
                tier.popular
                  ? "bg-black dark:bg-white border-2 border-black dark:border-white shadow-2xl"
                  : "bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800"
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-gray-600 to-black dark:from-gray-400 dark:to-white text-white dark:text-black rounded-full text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Tier Name */}
              <div className="mb-6">
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    tier.popular
                      ? "text-white dark:text-black"
                      : "text-black dark:text-white"
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`${
                    tier.popular
                      ? "text-gray-300 dark:text-gray-700"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-5xl font-bold ${
                      tier.popular
                        ? "text-white dark:text-black"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className={`text-lg ${
                        tier.popular
                          ? "text-gray-300 dark:text-gray-700"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              {tier.isPremium ? (
                <button
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all mb-8 disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.popular
                      ? "bg-white dark:bg-black text-black dark:text-white hover:scale-105"
                      : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  }`}
                >
                  {isUpgrading ? 'Processing...' : tier.cta}
                </button>
              ) : (
                <Link
                  href={tier.href}
                  className={`block w-full py-3.5 rounded-xl font-semibold text-center transition-all mb-8 ${
                    tier.popular
                      ? "bg-white dark:bg-black text-black dark:text-white hover:scale-105"
                      : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                  }`}
                >
                  {tier.cta}
                </Link>
              )}

              {/* Features */}
              <ul className="space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        tier.popular
                          ? "bg-white/20 dark:bg-black/20"
                          : "bg-black/10 dark:bg-white/10"
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${
                          tier.popular
                            ? "text-white dark:text-black"
                            : "text-black dark:text-white"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm ${
                        tier.popular
                          ? "text-gray-200 dark:text-gray-800"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <h2 className="text-3xl font-bold text-black dark:text-white text-center mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              Can I switch plans anytime?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yes! You can upgrade, downgrade, or cancel your subscription at any time.
              Changes take effect at the start of your next billing cycle.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              We accept all major credit cards (Visa, Mastercard, American Express) and
              debit cards through Stripe's secure payment processing.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              Is there a free trial for Premium?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              New users get a 7-day free trial of Premium with full access to all features.
              No credit card required to start your free tier.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              What happens to my data if I cancel?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your data remains accessible for 30 days after cancellation. You can export
              all your flashcards, notes, and content before permanent deletion.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 text-center">
        <div className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white dark:text-black mb-4">
            Still have questions?
          </h2>
          <p className="text-gray-300 dark:text-gray-700 mb-6">
            Our team is here to help. Reach out anytime.
          </p>
          <a
            href="mailto:support@ailearning.com"
            className="inline-block px-8 py-3 bg-white dark:bg-black text-black dark:text-white rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
