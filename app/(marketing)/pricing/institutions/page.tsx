'use client'

import Link from 'next/link'
import {
  Building2,
  Users,
  School,
  Check,
  Shield,
  BarChart3,
  BookOpen,
  FileText,
  Mail,
  Phone,
  ArrowRight,
} from 'lucide-react'

const FEATURES = {
  core: [
    { name: 'AI Flashcard Generation', included: true },
    { name: 'Audio Podcasts', included: true },
    { name: 'Interactive Mind Maps', included: true },
    { name: 'Practice Exams', included: true },
    { name: 'Document Chat (AI Tutor)', included: true },
    { name: 'Study Scheduling', included: true },
  ],
  institutional: [
    { name: 'Class Management', icon: School },
    { name: 'Assignment Creation', icon: FileText },
    { name: 'Student Progress Tracking', icon: BarChart3 },
    { name: 'Team Member Management', icon: Users },
    { name: 'Curriculum Library', icon: BookOpen },
    { name: 'State Compliance Reports', icon: Shield },
  ],
}

const TIERS = [
  {
    name: 'Starter',
    description: 'Perfect for small schools or homeschool co-ops',
    price: 199,
    period: '/month',
    seats: 50,
    features: [
      'Up to 50 seats',
      'All core study tools',
      'Class management',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/dashboard/org/setup',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing schools and districts',
    price: 499,
    period: '/month',
    seats: 200,
    features: [
      'Up to 200 seats',
      'All Starter features',
      'Advanced analytics',
      'LMS integration (Canvas, Google)',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/dashboard/org/setup',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large districts and universities',
    price: null,
    period: 'Custom',
    seats: 'Unlimited',
    features: [
      'Unlimited seats',
      'All Professional features',
      'SSO integration',
      'API access',
      'Dedicated success manager',
      'Custom contract terms',
      'FERPA compliance support',
    ],
    cta: 'Contact Sales',
    ctaLink: '#contact',
    popular: false,
  },
]

export default function InstitutionalPricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-6">
            <Building2 className="w-4 h-4" />
            For Schools & Institutions
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Transform How Your{' '}
            <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              Students Learn
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Give your students AI-powered study tools that adapt to their learning style.
            Track progress, create assignments, and improve outcomes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard/org/setup"
              className="flex items-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/25"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#contact"
              className="flex items-center gap-2 px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,000+', label: 'Students' },
              { value: '500+', label: 'Schools' },
              { value: '95%', label: 'Satisfaction' },
              { value: '2M+', label: 'Flashcards Created' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-violet-600 dark:text-violet-400">
                  {stat.value}
                </p>
                <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Everything Your Institution Needs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful tools for teachers and engaging study experiences for students
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.institutional.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.name}
                  className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-600 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.name}
                  </h3>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Per-seat pricing that scales with your institution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 ${
                  tier.popular
                    ? 'bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-xl shadow-violet-500/25'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className={`text-xl font-bold mb-2 ${tier.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mb-6 ${tier.popular ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                  {tier.description}
                </p>

                <div className="mb-6">
                  {tier.price ? (
                    <>
                      <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        ${tier.price}
                      </span>
                      <span className={tier.popular ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}>
                        {tier.period}
                      </span>
                    </>
                  ) : (
                    <span className={`text-4xl font-bold ${tier.popular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      Custom
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className={`w-5 h-5 ${tier.popular ? 'text-white' : 'text-green-500'}`} />
                      <span className={tier.popular ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaLink}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    tier.popular
                      ? 'bg-white text-violet-600 hover:bg-gray-100'
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Have questions? Our team is here to help.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="john@school.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Institution Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Westview Academy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Students
                </label>
                <select className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                  <option>1-50</option>
                  <option>51-200</option>
                  <option>201-500</option>
                  <option>501-1000</option>
                  <option>1000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Tell us about your needs..."
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors"
              >
                Send Message
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-600 dark:text-gray-400">
            <a href="mailto:sales@synaptic.study" className="flex items-center gap-2 hover:text-violet-600">
              <Mail className="w-5 h-5" />
              sales@synaptic.study
            </a>
            <a href="tel:+1-555-123-4567" className="flex items-center gap-2 hover:text-violet-600">
              <Phone className="w-5 h-5" />
              (555) 123-4567
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-violet-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Start your free 14-day trial today. No credit card required.
          </p>
          <Link
            href="/dashboard/org/setup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
